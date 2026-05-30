# Product Overview

ZamIO is a comprehensive music rights management and monitoring platform that tracks music plays across radio stations and streaming services, manages royalty calculations, and facilitates payments to artists, publishers, and performing rights organizations (PROs).

## Core Features

- **Music Monitoring**: Audio fingerprinting and detection system using hybrid local/ACRCloud identification
- **Multi-Stakeholder Platform**: Separate interfaces for artists, radio stations, publishers, and administrators
- **Royalty Management**: Automated royalty calculations with PRO integration and payment processing
- **Dispute Resolution**: Workflow system for handling play log disputes and ownership claims
- **Analytics Dashboard**: Real-time analytics and reporting for all stakeholders
- **Mobile Audio Capture**: Flutter mobile app for offline audio capture with sync capabilities

## User Roles

- **Artists**: Upload tracks, view play logs, track earnings, manage profiles
- **Radio Stations**: Submit play logs, manage station details, view analytics
- **Publishers**: Manage catalogs, track royalties, handle agreements
- **Administrators**: User management, dispute resolution, system configuration
- **Fans**: Discover music, follow artists (limited functionality)

## Technical Approach

The platform uses audio fingerprinting to identify music plays, calculates royalties based on configurable rates and agreements, and provides real-time notifications and analytics through WebSocket connections.
