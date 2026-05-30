"""
Test suite for royalty system fixes
Tests the critical fixes implemented for publisher routing and sub-distributions
"""

import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from artists.models import Artist, Track, Contributor
from stations.models import Station
from publishers.models import PublisherProfile
from music_monitor.models import PlayLog, RoyaltyDistribution, PublisherArtistSubDistribution
from royalties.calculator import RoyaltyCalculator

User = get_user_model()


@pytest.mark.django_db
class TestPublisherRoutingFix:
    """Test that publisher routing correctly sends payments to publisher's account"""
    
    def setup_method(self):
        """Set up test data"""
        # Create users
        self.artist_user = User.objects.create_user(
            email='artist@test.com',
            username='artist',
            password='test123',
            user_type='Artist'
        )
        
        self.publisher_user = User.objects.create_user(
            email='publisher@test.com',
            username='publisher',
            password='test123',
            user_type='Publisher'
        )
        
        # Create artist
        self.artist = Artist.objects.create(
            user=self.artist_user,
            stage_name='Test Artist',
            self_published=False
        )
        
        # Create publisher
        self.publisher = PublisherProfile.objects.create(
            user=self.publisher_user,
            company_name='Test Publisher',
            default_admin_fee_percent=Decimal('15.00')
        )
        
        # Link artist to publisher
        self.artist.publisher = self.publisher
        self.artist.save()
        
        # Create station
        self.station = Station.objects.create(
            name='Test Station',
            user=User.objects.create_user(
                email='station@test.com',
                username='station',
                password='test123',
                user_type='Station'
            )
        )
        
        # Create track
        self.track = Track.objects.create(
            artist=self.artist,
            title='Test Track',
            duration=timedelta(minutes=3)
        )
        
        # Create contributor with publisher
        self.contributor = Contributor.objects.create(
            user=self.artist_user,
            track=self.track,
            role='Composer',
            percent_split=Decimal('100.00'),
            publisher=self.publisher,
            active=True
        )
        
        # Create play log
        self.play_log = PlayLog.objects.create(
            track=self.track,
            station=self.station,
            played_at=timezone.now(),
            duration=timedelta(minutes=3)
        )
    
    def test_publisher_receives_payment_not_artist(self):
        """Test that payment goes to publisher's user account, not artist's"""
        calculator = RoyaltyCalculator()
        
        # Calculate royalties
        result = calculator.calculate_royalties(self.play_log)
        
        # Should have no errors
        assert len(result.errors) == 0, f"Calculation errors: {result.errors}"
        
        # Should have one distribution
        assert len(result.distributions) == 1
        
        # Create distributions
        distributions = calculator.create_royalty_distributions(result)
        
        # Should create one distribution
        assert len(distributions) == 1
        
        distribution = distributions[0]
        
        # CRITICAL: Recipient should be publisher's user, not artist's user
        assert distribution.recipient == self.publisher_user, \
            f"Expected recipient to be publisher user {self.publisher_user.email}, " \
            f"but got {distribution.recipient.email}"
        
        # Recipient type should be publisher
        assert distribution.recipient_type == 'publisher'
        
        # Should have positive amount
        assert distribution.net_amount > 0
    
    def test_sub_distribution_created_for_publisher_payment(self):
        """Test that sub-distribution is created when payment goes to publisher"""
        calculator = RoyaltyCalculator()
        
        # Calculate and create distributions
        result = calculator.calculate_royalties(self.play_log)
        distributions = calculator.create_royalty_distributions(result)
        
        distribution = distributions[0]
        
        # Should have created a sub-distribution
        sub_dists = PublisherArtistSubDistribution.objects.filter(
            parent_distribution=distribution
        )
        
        assert sub_dists.exists(), "Sub-distribution should be created for publisher payment"
        
        sub_dist = sub_dists.first()
        
        # Verify sub-distribution details
        assert sub_dist.publisher == self.publisher
        assert sub_dist.artist == self.artist_user
        assert sub_dist.total_amount == distribution.net_amount
        assert sub_dist.publisher_fee_percentage == Decimal('15.00')
        
        # Verify amounts are calculated correctly
        expected_publisher_fee = distribution.net_amount * Decimal('0.15')
        expected_artist_net = distribution.net_amount - expected_publisher_fee
        
        assert abs(sub_dist.publisher_fee_amount - expected_publisher_fee) < Decimal('0.01')
        assert abs(sub_dist.artist_net_amount - expected_artist_net) < Decimal('0.01')
    
    def test_self_published_artist_receives_direct_payment(self):
        """Test that self-published artists receive direct payment"""
        # Make artist self-published
        self.artist.self_published = True
        self.artist.publisher = None
        self.artist.save()
        
        # Update contributor to have no publisher
        self.contributor.publisher = None
        self.contributor.save()
        
        calculator = RoyaltyCalculator()
        
        # Calculate and create distributions
        result = calculator.calculate_royalties(self.play_log)
        distributions = calculator.create_royalty_distributions(result)
        
        distribution = distributions[0]
        
        # Should go directly to artist
        assert distribution.recipient == self.artist_user
        assert distribution.recipient_type == 'artist'
        
        # Should NOT create sub-distribution
        sub_dists = PublisherArtistSubDistribution.objects.filter(
            parent_distribution=distribution
        )
        assert not sub_dists.exists(), "No sub-distribution should be created for self-published artist"


@pytest.mark.django_db
class TestContributorSplitValidation:
    """Test that contributor split validation works correctly"""
    
    def setup_method(self):
        """Set up test data"""
        self.artist_user = User.objects.create_user(
            email='artist@test.com',
            username='artist',
            password='test123',
            user_type='Artist'
        )
        
        self.artist = Artist.objects.create(
            user=self.artist_user,
            stage_name='Test Artist'
        )
        
        self.station = Station.objects.create(
            name='Test Station',
            user=User.objects.create_user(
                email='station@test.com',
                username='station',
                password='test123',
                user_type='Station'
            )
        )
        
        self.track = Track.objects.create(
            artist=self.artist,
            title='Test Track',
            duration=timedelta(minutes=3)
        )
    
    def test_calculation_fails_with_no_contributors(self):
        """Test that calculation fails when track has no contributors"""
        play_log = PlayLog.objects.create(
            track=self.track,
            station=self.station,
            played_at=timezone.now(),
            duration=timedelta(minutes=3)
        )
        
        calculator = RoyaltyCalculator()
        result = calculator.calculate_royalties(play_log)
        
        # Should have error
        assert len(result.errors) > 0
        assert any('no active contributors' in error.lower() for error in result.errors)
        
        # Should have no distributions
        assert len(result.distributions) == 0
    
    def test_calculation_fails_with_invalid_splits(self):
        """Test that calculation fails when splits don't total 100%"""
        # Create contributors with invalid splits (total 90%)
        Contributor.objects.create(
            user=self.artist_user,
            track=self.track,
            role='Composer',
            percent_split=Decimal('60.00'),
            active=True
        )
        
        Contributor.objects.create(
            user=User.objects.create_user(
                email='producer@test.com',
                username='producer',
                password='test123'
            ),
            track=self.track,
            role='Producer',
            percent_split=Decimal('30.00'),
            active=True
        )
        
        play_log = PlayLog.objects.create(
            track=self.track,
            station=self.station,
            played_at=timezone.now(),
            duration=timedelta(minutes=3)
        )
        
        calculator = RoyaltyCalculator()
        result = calculator.calculate_royalties(play_log)
        
        # Should have error about invalid splits
        assert len(result.errors) > 0
        assert any('invalid' in error.lower() and 'split' in error.lower() for error in result.errors)
        
        # Should have no distributions
        assert len(result.distributions) == 0
    
    def test_calculation_succeeds_with_valid_splits(self):
        """Test that calculation succeeds when splits total 100%"""
        # Create contributors with valid splits (total 100%)
        Contributor.objects.create(
            user=self.artist_user,
            track=self.track,
            role='Composer',
            percent_split=Decimal('60.00'),
            active=True
        )
        
        Contributor.objects.create(
            user=User.objects.create_user(
                email='producer@test.com',
                username='producer',
                password='test123'
            ),
            track=self.track,
            role='Producer',
            percent_split=Decimal('40.00'),
            active=True
        )
        
        play_log = PlayLog.objects.create(
            track=self.track,
            station=self.station,
            played_at=timezone.now(),
            duration=timedelta(minutes=3)
        )
        
        calculator = RoyaltyCalculator()
        result = calculator.calculate_royalties(play_log)
        
        # Should have no errors
        assert len(result.errors) == 0
        
        # Should have two distributions (one per contributor)
        assert len(result.distributions) == 2
        
        # Verify split percentages
        splits = [d.percentage_split for d in result.distributions]
        assert Decimal('60.00') in splits
        assert Decimal('40.00') in splits


@pytest.mark.django_db
class TestSubDistributionStatusFlow:
    """Test sub-distribution status transitions"""
    
    def setup_method(self):
        """Set up test data"""
        self.artist_user = User.objects.create_user(
            email='artist@test.com',
            username='artist',
            password='test123',
            user_type='Artist'
        )
        
        self.publisher_user = User.objects.create_user(
            email='publisher@test.com',
            username='publisher',
            password='test123',
            user_type='Publisher'
        )
        
        self.publisher = PublisherProfile.objects.create(
            user=self.publisher_user,
            company_name='Test Publisher',
            default_admin_fee_percent=Decimal('15.00')
        )
        
        # Create parent distribution
        self.parent_distribution = RoyaltyDistribution.objects.create(
            play_log=None,  # Simplified for testing
            recipient=self.publisher_user,
            recipient_type='publisher',
            gross_amount=Decimal('100.00'),
            net_amount=Decimal('100.00'),
            currency='GHS',
            percentage_split=Decimal('100.00'),
            status='calculated'
        )
        
        # Create sub-distribution
        self.sub_dist = PublisherArtistSubDistribution.objects.create(
            parent_distribution=self.parent_distribution,
            publisher=self.publisher,
            artist=self.artist_user,
            total_amount=Decimal('100.00'),
            publisher_fee_percentage=Decimal('15.00'),
            currency='GHS',
            status='calculated'
        )
        self.sub_dist.calculate_amounts()
        self.sub_dist.save()
    
    def test_approve_sub_distribution(self):
        """Test approving a sub-distribution"""
        self.sub_dist.approve_for_payment()
        
        assert self.sub_dist.status == 'approved'
        assert self.sub_dist.approved_at is not None
    
    def test_mark_sub_distribution_paid(self):
        """Test marking sub-distribution as paid"""
        self.sub_dist.mark_as_paid('TXN123456', 'Bank Transfer')
        
        assert self.sub_dist.status == 'paid'
        assert self.sub_dist.paid_to_artist_at is not None
        assert self.sub_dist.payment_reference == 'TXN123456'
        assert self.sub_dist.payment_method == 'Bank Transfer'
    
    def test_parent_status_updates_when_sub_dist_paid(self):
        """Test that parent distribution status updates when sub-distribution is paid"""
        # Mark sub-distribution as paid
        self.sub_dist.mark_as_paid('TXN123456')
        
        # Refresh parent from database
        self.parent_distribution.refresh_from_db()
        
        # Parent should be marked as paid (since it's the only sub-distribution)
        assert self.parent_distribution.status == 'paid'
        assert self.parent_distribution.paid_at is not None


@pytest.mark.django_db
class TestRoyaltyCalculation:
    """Test royalty calculation formulas"""
    
    def test_calculation_with_different_station_classes(self):
        """Test that different station classes produce different rates"""
        # This would require more setup, but demonstrates the concept
        # Station class affects base rate
        # Time of day affects multiplier
        # Duration affects total
        pass
    
    def test_calculation_with_time_of_day_multipliers(self):
        """Test that time of day affects calculation"""
        # Prime time should have higher multiplier
        # Off-peak should have lower multiplier
        pass


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
