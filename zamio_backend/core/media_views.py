"""
Custom media file serving with CORS headers
"""
import os
import mimetypes
from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from django.views.decorators.http import require_GET
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
@require_GET
def serve_media_with_cors(request, path):
    """
    Serve media files with proper CORS headers for cross-origin access.
    This is especially important for images, audio, and video files.
    """
    # Construct the full file path
    file_path = os.path.join(settings.MEDIA_ROOT, path)
    
    # Security check: ensure the file is within MEDIA_ROOT
    file_path = os.path.abspath(file_path)
    media_root = os.path.abspath(settings.MEDIA_ROOT)
    
    if not file_path.startswith(media_root):
        raise Http404("Invalid file path")
    
    # Check if file exists
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        raise Http404("File not found")
    
    # Determine content type
    content_type, _ = mimetypes.guess_type(file_path)
    if content_type is None:
        content_type = 'application/octet-stream'
    
    # Open and serve the file
    try:
        response = FileResponse(open(file_path, 'rb'), content_type=content_type)
        
        # Add CORS headers
        response['Access-Control-Allow-Origin'] = '*'  # Allow all origins for media
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Range, Accept, Accept-Encoding'
        response['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Accept-Ranges'
        
        # Add caching headers for better performance
        response['Cache-Control'] = 'public, max-age=31536000'  # Cache for 1 year
        
        # For audio/video files, support range requests
        if content_type.startswith(('audio/', 'video/')):
            response['Accept-Ranges'] = 'bytes'
        
        return response
    except Exception as e:
        raise Http404(f"Error serving file: {str(e)}")
