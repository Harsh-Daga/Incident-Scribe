#!/usr/bin/env python3
"""
AI Agent - Data Aggregation Script
Aggregates data from multiple sources for comprehensive incident analysis
"""

import json
import sys
import os

def aggregate_incident_data(incident_data):
    """
    Aggregates data from multiple sources:
    - Current incident logs
    - Current incident metrics
    - Historical incidents (similar patterns)
    - Service context
    """
    
    # Load historical incidents if available
    historical_incidents = []
    historical_path = '/app/data/mock-incidents.json'
    
    if os.path.exists(historical_path):
        try:
            with open(historical_path, 'r') as f:
                all_incidents = json.load(f)
                # Find similar incidents by service or error pattern
                service = incident_data.get('service', '')
                historical_incidents = [
                    inc for inc in all_incidents 
                    if inc.get('service') == service and inc.get('id') != incident_data.get('id')
                ][:3]  # Get up to 3 similar incidents
        except Exception as e:
            print(f"Warning: Could not load historical incidents: {e}", file=sys.stderr)
    
    # Aggregate data from multiple sources
    aggregated = {
        "current_incident": incident_data,
        "data_sources": {
            "logs": {
                "source": "current_incident",
                "count": len(incident_data.get("logs", [])),
                "sample": incident_data.get("logs", [])[:3]
            },
            "metrics": {
                "source": "monitoring_system",
                "data": incident_data.get("metrics", {})
            },
            "context": {
                "source": "service_registry",
                "data": incident_data.get("context", {})
            },
            "historical_patterns": {
                "source": "incident_database",
                "count": len(historical_incidents),
                "incidents": historical_incidents
            }
        },
        "aggregation_summary": {
            "total_sources": 4,
            "log_entries": len(incident_data.get("logs", [])),
            "metric_points": len(incident_data.get("metrics", {})),
            "similar_incidents": len(historical_incidents),
            "aggregation_timestamp": incident_data.get("timestamp", "")
        }
    }
    
    return aggregated

if __name__ == "__main__":
    # Read incident data from stdin or file
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            incident_data = json.load(f)
    else:
        incident_data = json.load(sys.stdin)
    
    aggregated = aggregate_incident_data(incident_data)
    print(json.dumps(aggregated, indent=2))

