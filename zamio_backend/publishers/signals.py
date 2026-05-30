from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import PublisherArtistRelationship


def _get_self_published_flag(artist):
    """Return the artist self-published flag regardless of attribute name."""
    if hasattr(artist, 'self_publish'):
        return bool(getattr(artist, 'self_publish'))
    return bool(getattr(artist, 'is_self_published', True))


def _set_self_published_flag(artist, value: bool) -> None:
    """Persist the artist self-published flag, handling legacy/new attribute names."""
    attr = 'self_publish' if hasattr(artist, 'self_publish') else 'is_self_published'
    current = getattr(artist, attr, None)
    desired = bool(value)

    if current != desired:
        setattr(artist, attr, desired)
        artist.save(update_fields=[attr])


@receiver(post_save, sender=PublisherArtistRelationship)
def update_artist_self_publish_status(sender, instance, created, **kwargs):
    """Update the artist self-published flag when publisher relationships change."""
    artist = instance.artist

    active_relationships = PublisherArtistRelationship.objects.filter(
        artist=artist,
        status='active',
    )

    is_self_published = _get_self_published_flag(artist)
    if active_relationships.exists():
        if is_self_published:
            _set_self_published_flag(artist, False)
    elif not is_self_published:
        _set_self_published_flag(artist, True)


@receiver(post_delete, sender=PublisherArtistRelationship)
def update_artist_self_publish_on_delete(sender, instance, **kwargs):
    """Ensure artist reverts to self-published when relationships are removed."""
    artist = instance.artist

    active_relationships = PublisherArtistRelationship.objects.filter(
        artist=artist,
        status='active',
    )

    if not active_relationships.exists():
        _set_self_published_flag(artist, True)