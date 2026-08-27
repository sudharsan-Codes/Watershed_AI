"""Demo spatial and domain data for WATERSIGHT AI.

Mirrors frontend demo data in src/data/ and src/data/geo/.
"""

from typing import Any, Dict, List

WATERSHEDS: List[Dict[str, Any]] = [
    {
        "id": "ws-demo-a",
        "name": "Demo Watershed A",
        "district": "Coimbatore",
        "state": "Tamil Nadu",
        "areaHectares": 1248,
        "status": "Under Monitoring",
        "boundaryGeoJsonId": "ws-demo-a-boundary",
        "centerLat": 11.0168,
        "centerLng": 76.9558,
    }
]

WATERSHED_BOUNDARIES: Dict[str, Dict[str, Any]] = {
    "ws-demo-a": {
        "type": "Feature",
        "properties": {
            "id": "ws-demo-a-boundary",
            "name": "Demo Watershed A",
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [76.938, 11.032],
                    [76.958, 11.038],
                    [76.975, 11.028],
                    [76.978, 11.008],
                    [76.963, 10.995],
                    [76.942, 10.999],
                    [76.932, 11.015],
                    [76.938, 11.032],
                ]
            ],
        },
    }
}

INTERVENTIONS: List[Dict[str, Any]] = [
    {
        "id": "int-checkdam-024",
        "code": "Check Dam 024",
        "type": "Check Dam",
        "watershedId": "ws-demo-a",
        "latitude": 11.0168,
        "longitude": 76.9558,
        "status": "Active",
    },
    {
        "id": "int-farmpond-012",
        "code": "Farm Pond 012",
        "type": "Farm Pond",
        "watershedId": "ws-demo-a",
        "latitude": 11.0122,
        "longitude": 76.9511,
        "status": "Active",
    },
    {
        "id": "int-contourtrench-007",
        "code": "Contour Trench 007",
        "type": "Contour Trench",
        "watershedId": "ws-demo-a",
        "latitude": 11.019,
        "longitude": 76.9602,
        "status": "Active",
    },
]

FIELD_EVIDENCE: List[Dict[str, Any]] = [
    {
        "id": "ev-001",
        "imageUrl": "/demo-check-dam.jpg",
        "captureDate": "2026-08-20",
        "latitude": 11.0168,
        "longitude": 76.9558,
        "watershedId": "ws-demo-a",
        "interventionId": "int-checkdam-024",
        "verificationStatus": "Field Verified",
        "aiClassification": {
            "label": "Check Dam",
            "confidence": 0.92,
            "modelConnected": False,
        },
    },
    {
        "id": "ev-002",
        "imageUrl": "/demo-farm-pond.jpg",
        "captureDate": "2026-08-18",
        "latitude": 11.0122,
        "longitude": 76.9511,
        "watershedId": "ws-demo-a",
        "interventionId": "int-farmpond-012",
        "verificationStatus": "Requires Verification",
        "aiClassification": {
            "label": "Farm Pond",
            "confidence": 0.78,
            "modelConnected": False,
        },
    },
    {
        "id": "ev-003",
        "imageUrl": "/demo-contour-trench.jpg",
        "captureDate": "2026-08-15",
        "latitude": 11.019,
        "longitude": 76.9602,
        "watershedId": "ws-demo-a",
        "interventionId": "int-contourtrench-007",
        "verificationStatus": "Field Verified",
        "aiClassification": {
            "label": "Contour Trench",
            "confidence": 0.87,
            "modelConnected": False,
        },
    },
    {
        "id": "ev-004",
        "imageUrl": "/demo-farm-pond-2.jpg",
        "captureDate": "2026-08-12",
        "latitude": 11.021,
        "longitude": 76.9487,
        "watershedId": "ws-demo-a",
        "interventionId": "int-farmpond-012",
        "verificationStatus": "Field Verified",
    },
]
