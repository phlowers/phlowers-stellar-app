# /// script
# requires-python = ">=3.12,<3.13"
# dependencies = ["faker == 19.1.0"]
# ///

from typing import TypedDict
import uuid
import random
import json
import os
from faker import Faker


class Attachment(TypedDict):
    uuid: str
    updated_at: str
    created_at: str
    support_internal_id: str
    support_order: int
    support_number: int
    support_catalog_internal_id: str
    support_short_name: str
    support_name: str
    tower_model: str
    line_angle: float
    support_ground_z: float
    support_ground_x: float
    support_ground_y: float
    attachment_type: str
    attachment_set: str
    attachment_set_z: float
    attachment_set_x: float
    attachment_set_y: float
    cross_arm_relative_altitude: float
    cross_arm_length: float
    chain_drn_catalog_internal_id: str
    chain_drn_internal_id: str
    chain_drn_short_name: str
    chain_drn_name: str
    chain_drn_length: float
    chain_drn_weight: float
    chain_drn_surface: str
    chain_inl_catalog_internal_id: str
    chain_inl_internal_id: str
    chain_inl_short_name: str
    chain_inl_name: str
    chain_inl_length: float
    chain_inl_weight: float
    chain_inl_surface: str
    cable_attachment_z: float
    cable_attachment_x: float
    cable_attachment_y: float
    

class Branch(TypedDict):
    uuid: str
    internal_id: str
    name: str
    short_name: str
    created_at: str
    updated_at: str
    

class Section(TypedDict):
    uuid: str
    internal_id: str
    name: str
    short_name: str
    created_at: str
    updated_at: str
    internal_catalog_id: str
    type: str
    cable_name: str
    cable_short_name: str
    cables_amount: int
    optical_fibers_amount: int
    spans_amount: int
    begin_span_name: str
    last_span_name: str
    first_support_number: int
    last_support_number: int
    first_attachment_set: str
    last_attachment_set: str
    

class TransitLink(TypedDict):
    uuid: str
    internal_id: str
    name: str
    short_name: str
    created_at: str
    updated_at: str
    

class Tension(TypedDict):
    uuid: str
    internal_id: str
    name: str
    short_name: str
    created_at: str
    updated_at: str
    

class Span(TypedDict):
    uuid: str
    unit_span_internal_id: str
    order: int
    unit_span_name: str
    short_name: str
    section_internal_id: str
    section_short_name: str
    section_name: str
    maintenance_center_internal_id: str
    maintenance_center_designation: str
    maintenance_team_internal_id: str
    maintenance_team_designation: str
    span_length: float
    first_support_internal_id: str
    last_support_internal_id: str
    first_attachment_set_internal_id: str
    last_attachment_set_internal_id: str
    first_chain_catalog_internal_id: str
    last_chain_catalog_internal_id: str
    

class Line(TypedDict):
    uuid: str
    internal_id: str
    name: str
    short_name: str
    created_at: str
    updated_at: str
    

class MaintenanceCenter(TypedDict):
    uuid: str
    internal_id: str
    name: str
    created_at: str
    updated_at: str
    

class RegionalMaintenanceCenter(TypedDict):
    uuid: str
    internal_id: str
    name: str
    created_at: str
    updated_at: str
    

def generate_uuid():
    return str(uuid.uuid4())


def generate_timestamp():
    fake = Faker()
    return fake.date_time_between(start_date='-2y', end_date='now').isoformat()


def generate_attachment(index: int) -> Attachment:
    support_number = index + 1
    return {
        "uuid": generate_uuid(),
        "updated_at": generate_timestamp(),
        "created_at": generate_timestamp(),
        "support_internal_id": f"SUP-{support_number:04d}",
        "support_order": index,
        "support_number": support_number,
        "support_catalog_internal_id": f"SCAT-{random.randint(1000, 9999)}",
        "support_short_name": f"S{support_number}",
        "support_name": f"Support {support_number}",
        "tower_model": random.choice(["A-Type", "B-Type", "C-Type", "D-Type"]),
        "line_angle": random.uniform(0, 45),
        "support_ground_z": random.uniform(100, 500),
        "support_ground_x": random.uniform(-1000, 1000),
        "support_ground_y": random.uniform(-1000, 1000),
        "attachment_type": random.choice(["Suspension", "Tension", "Anchor"]),
        "attachment_set": f"AS-{random.randint(100, 999)}",
        "attachment_set_z": random.uniform(20, 50),
        "attachment_set_x": random.uniform(-10, 10),
        "attachment_set_y": random.uniform(-10, 10),
        "cross_arm_relative_altitude": random.uniform(0, 5),
        "cross_arm_length": random.uniform(2, 8),
        "chain_drn_catalog_internal_id": f"CDRN-{random.randint(1000, 9999)}",
        "chain_drn_internal_id": f"CDRN-{random.randint(100, 999)}",
        "chain_drn_short_name": f"CD{random.randint(10, 99)}",
        "chain_drn_name": f"Chain DRN {random.randint(10, 99)}",
        "chain_drn_length": random.uniform(1, 5),
        "chain_drn_weight": random.uniform(50, 200),
        "chain_drn_surface": random.choice(["Galvanized", "Coated", "Stainless"]),
        "chain_inl_catalog_internal_id": f"CINL-{random.randint(1000, 9999)}",
        "chain_inl_internal_id": f"CINL-{random.randint(100, 999)}",
        "chain_inl_short_name": f"CI{random.randint(10, 99)}",
        "chain_inl_name": f"Chain INL {random.randint(10, 99)}",
        "chain_inl_length": random.uniform(1, 5),
        "chain_inl_weight": random.uniform(50, 200),
        "chain_inl_surface": random.choice(["Galvanized", "Coated", "Stainless"]),
        "cable_attachment_z": random.uniform(20, 50),
        "cable_attachment_x": random.uniform(-5, 5),
        "cable_attachment_y": random.uniform(-5, 5),
    }


def generate_branch(index: int) -> Branch:
    branch_id = index + 1
    return {
        "uuid": generate_uuid(),
        "internal_id": f"BR-{branch_id:04d}",
        "name": f"Branch {branch_id}",
        "short_name": f"B{branch_id}",
        "created_at": generate_timestamp(),
        "updated_at": generate_timestamp(),
    }


def generate_section(index: int) -> Section:
    section_id = index + 1
    first_support = random.randint(1, 50)
    last_support = first_support + random.randint(5, 20)
    return {
        "uuid": generate_uuid(),
        "internal_id": f"SEC-{section_id:04d}",
        "name": f"Section {section_id}",
        "short_name": f"S{section_id}",
        "created_at": generate_timestamp(),
        "updated_at": generate_timestamp(),
        "internal_catalog_id": f"SCAT-{random.randint(1000, 9999)}",
        "type": random.choice(["Transmission", "Distribution", "Interconnection"]),
        "cable_name": f"Cable Type {random.choice(['A', 'B', 'C', 'D'])}{random.randint(100, 999)}",
        "cable_short_name": f"C{random.randint(10, 99)}",
        "cables_amount": random.randint(1, 6),
        "optical_fibers_amount": random.randint(0, 24),
        "spans_amount": last_support - first_support,
        "begin_span_name": f"Span {first_support}",
        "last_span_name": f"Span {last_support}",
        "first_support_number": first_support,
        "last_support_number": last_support,
        "first_attachment_set": f"AS-{random.randint(100, 999)}",
        "last_attachment_set": f"AS-{random.randint(100, 999)}",
    }


def generate_transit_link(index: int) -> TransitLink:
    link_id = index + 1
    return {
        "uuid": generate_uuid(),
        "internal_id": f"TL-{link_id:04d}",
        "name": f"Transit Link {link_id}",
        "short_name": f"TL{link_id}",
        "created_at": generate_timestamp(),
        "updated_at": generate_timestamp(),
    }


def generate_tension(index: int) -> Tension:
    tension_id = index + 1
    return {
        "uuid": generate_uuid(),
        "internal_id": f"TEN-{tension_id:04d}",
        "name": f"Tension {tension_id}",
        "short_name": f"T{tension_id}",
        "created_at": generate_timestamp(),
        "updated_at": generate_timestamp(),
    }


def generate_span(index: int) -> Span:
    span_id = index + 1
    return {
        "uuid": generate_uuid(),
        "unit_span_internal_id": f"SPAN-{span_id:04d}",
        "order": index,
        "unit_span_name": f"Span {span_id}",
        "short_name": f"SP{span_id}",
        "section_internal_id": f"SEC-{random.randint(1000, 9999)}",
        "section_short_name": f"S{random.randint(10, 99)}",
        "section_name": f"Section {random.randint(10, 99)}",
        "maintenance_center_internal_id": f"MC-{random.randint(100, 999)}",
        "maintenance_center_designation": f"Maintenance Center {random.randint(1, 10)}",
        "maintenance_team_internal_id": f"MT-{random.randint(100, 999)}",
        "maintenance_team_designation": f"Team {random.choice(['Alpha', 'Beta', 'Gamma', 'Delta'])}",
        "span_length": random.uniform(200, 500),
        "first_support_internal_id": f"SUP-{random.randint(1000, 9999)}",
        "last_support_internal_id": f"SUP-{random.randint(1000, 9999)}",
        "first_attachment_set_internal_id": f"AS-{random.randint(100, 999)}",
        "last_attachment_set_internal_id": f"AS-{random.randint(100, 999)}",
        "first_chain_catalog_internal_id": f"CCAT-{random.randint(100, 999)}",
        "last_chain_catalog_internal_id": f"CCAT-{random.randint(100, 999)}",
    }


def generate_line(index: int) -> Line:
    line_id = index + 1
    return {
        "uuid": generate_uuid(),
        "internal_id": f"LINE-{line_id:04d}",
        "name": f"Line {line_id}",
        "short_name": f"L{line_id}",
        "created_at": generate_timestamp(),
        "updated_at": generate_timestamp(),
    }


def generate_maintenance_center(index: int) -> MaintenanceCenter:
    center_id = index + 1
    return {
        "uuid": generate_uuid(),
        "internal_id": f"MC-{center_id:04d}",
        "name": f"Maintenance Center {center_id}",
        "created_at": generate_timestamp(),
        "updated_at": generate_timestamp(),
    }


def generate_regional_maintenance_center(index: int) -> RegionalMaintenanceCenter:
    center_id = index + 1
    return {
        "uuid": generate_uuid(),
        "internal_id": f"RMC-{center_id:04d}",
        "name": f"Regional Maintenance Center {center_id}",
        "created_at": generate_timestamp(),
        "updated_at": generate_timestamp(),
    }


def generate_mock_data(count: int = 10):
    data = {
        "attachments": [generate_attachment(i) for i in range(count)],
        "branches": [generate_branch(i) for i in range(count)],
        "sections": [generate_section(i) for i in range(count)],
        "transit_links": [generate_transit_link(i) for i in range(count)],
        "tensions": [generate_tension(i) for i in range(count)],
        "spans": [generate_span(i) for i in range(count)],
        "lines": [generate_line(i) for i in range(count)],
        "maintenance_centers": [generate_maintenance_center(i) for i in range(count)],
        "regional_maintenance_centers": [generate_regional_maintenance_center(i) for i in range(count)],
    }
    return data


if __name__ == "__main__":
    # Generate mock data
    mock_data = generate_mock_data(20)
    
    # Save to JSON file relative to the current file create file if it doesn't exist
    file_path = os.path.join(os.path.dirname(__file__), "@core/store/database/mock_data.json")
    if not os.path.exists(file_path):
        with open(file_path, "a") as f:
            json.dump(mock_data, f, indent=2)
    else:
        with open(file_path, "w+") as f:
            json.dump(mock_data, f, indent=2)
    
    print(f"Mock data generated and saved to mock_data.json")
    