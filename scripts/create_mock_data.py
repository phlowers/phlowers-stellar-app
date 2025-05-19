# /// script
# requires-python = ">=3.12"
# dependencies = ["faker == 19.1.0"]
# ///

from typing import TypedDict
import uuid
import random
import json
import os
from faker import Faker

cables = [
  {
    "name": "ASTER600",
    "data_source": "fictive",
    "section": 600.4,
    "diameter": 31.86,
    "young_modulus": 60000,
    "linear_weight": 1.8,
    "dilatation_coefficient": 0.000023,
    "temperature_reference": 15,
    "stress_strain_a0": 0,
    "stress_strain_a1": 60000,
    "stress_strain_a2": 0,
    "stress_strain_a3": 0,
    "stress_strain_a4": 0,
    "stress_strain_b0": 0,
    "stress_strain_b1": 0,
    "stress_strain_b2": 0,
    "stress_strain_b3": 0,
    "stress_strain_b4": 0
  },
  {
    "name": "CROCUS400",
    "data_source": "fictive",
    "section": 400.9,
    "diameter": 26.16,
    "young_modulus": 72000,
    "linear_weight": 1.6,
    "dilatation_coefficient": 0.0000176,
    "temperature_reference": 15,
    "stress_strain_a0": 0,
    "stress_strain_a1": 72000,
    "stress_strain_a2": 0,
    "stress_strain_a3": 0,
    "stress_strain_a4": 0,
    "stress_strain_b0": 0,
    "stress_strain_b1": 0,
    "stress_strain_b2": 0,
    "stress_strain_b3": 0,
    "stress_strain_b4": 0
  },
  {
    "name": "NARCISSE600G",
    "data_source": "fictive",
    "section": 600.4,
    "diameter": 29.56,
    "young_modulus": 75565,
    "linear_weight": 2.2,
    "dilatation_coefficient": 0.0000177,
    "temperature_reference": 15,
    "stress_strain_a0": 0,
    "stress_strain_a1": 27804,
    "stress_strain_a2": -6590391,
    "stress_strain_a3": 672009160,
    "stress_strain_a4": -24561975349,
    "stress_strain_b0": 0,
    "stress_strain_b1": 33140,
    "stress_strain_b2": 0,
    "stress_strain_b3": 0,
    "stress_strain_b4": 0
  },
  {
    "name": "PETUNIA600",
    "data_source": "fictive",
    "section": 599.7,
    "diameter": 31.66,
    "young_modulus": 70000,
    "linear_weight": 2.3,
    "dilatation_coefficient": 0.0000182,
    "temperature_reference": 15,
    "stress_strain_a0": 0,
    "stress_strain_a1": 70000,
    "stress_strain_a2": 0,
    "stress_strain_a3": 0,
    "stress_strain_a4": 0,
    "stress_strain_b0": 0,
    "stress_strain_b1": 0,
    "stress_strain_b2": 0,
    "stress_strain_b3": 0,
    "stress_strain_b4": 0
  }
]

french_departments = [
  {
    "num_dep": "01",
    "dep_name": "Ain",
    "region_name": "Auvergne-Rhône-Alpes"
  },
  {
    "num_dep": "02",
    "dep_name": "Aisne",
    "region_name": "Hauts-de-France"
  },
  {
    "num_dep": "03",
    "dep_name": "Allier",
    "region_name": "Auvergne-Rhône-Alpes"
  },
  {
    "num_dep": "04",
    "dep_name": "Alpes-de-Haute-Provence",
    "region_name": "Provence-Alpes-Côte d'Azur"
  },
  {
    "num_dep": "05",
    "dep_name": "Hautes-Alpes",
    "region_name": "Provence-Alpes-Côte d'Azur"
  },
  {
    "num_dep": "06",
    "dep_name": "Alpes-Maritimes",
    "region_name": "Provence-Alpes-Côte d'Azur"
  },
  {
    "num_dep": "07",
    "dep_name": "Ardèche",
    "region_name": "Auvergne-Rhône-Alpes"
  },
  {
    "num_dep": "08",
    "dep_name": "Ardennes",
    "region_name": "Grand Est"
  },
  {
    "num_dep": "09",
    "dep_name": "Ariège",
    "region_name": "Occitanie"
  },
  {
    "num_dep": 10,
    "dep_name": "Aube",
    "region_name": "Grand Est"
  },
  {
    "num_dep": 11,
    "dep_name": "Aude",
    "region_name": "Occitanie"
  },
  {
    "num_dep": 12,
    "dep_name": "Aveyron",
    "region_name": "Occitanie"
  },
  {
    "num_dep": 13,
    "dep_name": "Bouches-du-Rhône",
    "region_name": "Provence-Alpes-Côte d'Azur"
  },
  {
    "num_dep": 14,
    "dep_name": "Calvados",
    "region_name": "Normandie"
  },
  {
    "num_dep": 15,
    "dep_name": "Cantal",
    "region_name": "Auvergne-Rhône-Alpes"
  },
  {
    "num_dep": 16,
    "dep_name": "Charente",
    "region_name": "Nouvelle-Aquitaine"
  },
  {
    "num_dep": 17,
    "dep_name": "Charente-Maritime",
    "region_name": "Nouvelle-Aquitaine"
  },
  {
    "num_dep": 18,
    "dep_name": "Cher",
    "region_name": "Centre-Val de Loire"
  },
  {
    "num_dep": 19,
    "dep_name": "Corrèze",
    "region_name": "Nouvelle-Aquitaine"
  },
  {
    "num_dep": 21,
    "dep_name": "Côte-d'Or",
    "region_name": "Bourgogne-Franche-Comté"
  },
  {
    "num_dep": 22,
    "dep_name": "Côtes-d'Armor",
    "region_name": "Bretagne"
  },
  {
    "num_dep": 23,
    "dep_name": "Creuse",
    "region_name": "Nouvelle-Aquitaine"
  },
  {
    "num_dep": 24,
    "dep_name": "Dordogne",
    "region_name": "Nouvelle-Aquitaine"
  },
  {
    "num_dep": 25,
    "dep_name": "Doubs",
    "region_name": "Bourgogne-Franche-Comté"
  },
  {
    "num_dep": 26,
    "dep_name": "Drôme",
    "region_name": "Auvergne-Rhône-Alpes"
  },
  {
    "num_dep": 27,
    "dep_name": "Eure",
    "region_name": "Normandie"
  },
  {
    "num_dep": 28,
    "dep_name": "Eure-et-Loir",
    "region_name": "Centre-Val de Loire"
  },
  {
    "num_dep": 29,
    "dep_name": "Finistère",
    "region_name": "Bretagne"
  },
  {
    "num_dep": "2A",
    "dep_name": "Corse-du-Sud",
    "region_name": "Corse"
  },
  {
    "num_dep": "2B",
    "dep_name": "Haute-Corse",
    "region_name": "Corse"
  },
  {
    "num_dep": 30,
    "dep_name": "Gard",
    "region_name": "Occitanie"
  },
  {
    "num_dep": 31,
    "dep_name": "Haute-Garonne",
    "region_name": "Occitanie"
  },
  {
    "num_dep": 32,
    "dep_name": "Gers",
    "region_name": "Occitanie"
  },
  {
    "num_dep": 33,
    "dep_name": "Gironde",
    "region_name": "Nouvelle-Aquitaine"
  },
  {
    "num_dep": 34,
    "dep_name": "Hérault",
    "region_name": "Occitanie"
  },
  {
    "num_dep": 35,
    "dep_name": "Ille-et-Vilaine",
    "region_name": "Bretagne"
  },
  {
    "num_dep": 36,
    "dep_name": "Indre",
    "region_name": "Centre-Val de Loire"
  },
  {
    "num_dep": 37,
    "dep_name": "Indre-et-Loire",
    "region_name": "Centre-Val de Loire"
  },
  {
    "num_dep": 38,
    "dep_name": "Isère",
    "region_name": "Auvergne-Rhône-Alpes"
  },
  {
    "num_dep": 39,
    "dep_name": "Jura",
    "region_name": "Bourgogne-Franche-Comté"
  },
  {
    "num_dep": 40,
    "dep_name": "Landes",
    "region_name": "Nouvelle-Aquitaine"
  },
  {
    "num_dep": 41,
    "dep_name": "Loir-et-Cher",
    "region_name": "Centre-Val de Loire"
  },
  {
    "num_dep": 42,
    "dep_name": "Loire",
    "region_name": "Auvergne-Rhône-Alpes"
  },
  {
    "num_dep": 43,
    "dep_name": "Haute-Loire",
    "region_name": "Auvergne-Rhône-Alpes"
  },
  {
    "num_dep": 44,
    "dep_name": "Loire-Atlantique",
    "region_name": "Pays de la Loire"
  },
  {
    "num_dep": 45,
    "dep_name": "Loiret",
    "region_name": "Centre-Val de Loire"
  },
  {
    "num_dep": 46,
    "dep_name": "Lot",
    "region_name": "Occitanie"
  },
  {
    "num_dep": 47,
    "dep_name": "Lot-et-Garonne",
    "region_name": "Nouvelle-Aquitaine"
  },
  {
    "num_dep": 48,
    "dep_name": "Lozère",
    "region_name": "Occitanie"
  },
  {
    "num_dep": 49,
    "dep_name": "Maine-et-Loire",
    "region_name": "Pays de la Loire"
  },
  {
    "num_dep": 50,
    "dep_name": "Manche",
    "region_name": "Normandie"
  },
  {
    "num_dep": 51,
    "dep_name": "Marne",
    "region_name": "Grand Est"
  },
  {
    "num_dep": 52,
    "dep_name": "Haute-Marne",
    "region_name": "Grand Est"
  },
  {
    "num_dep": 53,
    "dep_name": "Mayenne",
    "region_name": "Pays de la Loire"
  },
  {
    "num_dep": 54,
    "dep_name": "Meurthe-et-Moselle",
    "region_name": "Grand Est"
  },
  {
    "num_dep": 55,
    "dep_name": "Meuse",
    "region_name": "Grand Est"
  },
  {
    "num_dep": 56,
    "dep_name": "Morbihan",
    "region_name": "Bretagne"
  },
  {
    "num_dep": 57,
    "dep_name": "Moselle",
    "region_name": "Grand Est"
  },
  {
    "num_dep": 58,
    "dep_name": "Nièvre",
    "region_name": "Bourgogne-Franche-Comté"
  },
  {
    "num_dep": 59,
    "dep_name": "Nord",
    "region_name": "Hauts-de-France"
  },
  {
    "num_dep": 60,
    "dep_name": "Oise",
    "region_name": "Hauts-de-France"
  },
  {
    "num_dep": 61,
    "dep_name": "Orne",
    "region_name": "Normandie"
  },
  {
    "num_dep": 62,
    "dep_name": "Pas-de-Calais",
    "region_name": "Hauts-de-France"
  },
  {
    "num_dep": 63,
    "dep_name": "Puy-de-Dôme",
    "region_name": "Auvergne-Rhône-Alpes"
  },
  {
    "num_dep": 64,
    "dep_name": "Pyrénées-Atlantiques",
    "region_name": "Nouvelle-Aquitaine"
  },
  {
    "num_dep": 65,
    "dep_name": "Hautes-Pyrénées",
    "region_name": "Occitanie"
  },
  {
    "num_dep": 66,
    "dep_name": "Pyrénées-Orientales",
    "region_name": "Occitanie"
  },
  {
    "num_dep": 67,
    "dep_name": "Bas-Rhin",
    "region_name": "Grand Est"
  },
  {
    "num_dep": 68,
    "dep_name": "Haut-Rhin",
    "region_name": "Grand Est"
  },
  {
    "num_dep": 69,
    "dep_name": "Rhône",
    "region_name": "Auvergne-Rhône-Alpes"
  },
  {
    "num_dep": 70,
    "dep_name": "Haute-Saône",
    "region_name": "Bourgogne-Franche-Comté"
  },
  {
    "num_dep": 71,
    "dep_name": "Saône-et-Loire",
    "region_name": "Bourgogne-Franche-Comté"
  },
  {
    "num_dep": 72,
    "dep_name": "Sarthe",
    "region_name": "Pays de la Loire"
  },
  {
    "num_dep": 73,
    "dep_name": "Savoie",
    "region_name": "Auvergne-Rhône-Alpes"
  },
  {
    "num_dep": 74,
    "dep_name": "Haute-Savoie",
    "region_name": "Auvergne-Rhône-Alpes"
  },
  {
    "num_dep": 75,
    "dep_name": "Paris",
    "region_name": "Île-de-France"
  },
  {
    "num_dep": 76,
    "dep_name": "Seine-Maritime",
    "region_name": "Normandie"
  },
  {
    "num_dep": 77,
    "dep_name": "Seine-et-Marne",
    "region_name": "Île-de-France"
  },
  {
    "num_dep": 78,
    "dep_name": "Yvelines",
    "region_name": "Île-de-France"
  },
  {
    "num_dep": 79,
    "dep_name": "Deux-Sèvres",
    "region_name": "Nouvelle-Aquitaine"
  },
  {
    "num_dep": 80,
    "dep_name": "Somme",
    "region_name": "Hauts-de-France"
  },
  {
    "num_dep": 81,
    "dep_name": "Tarn",
    "region_name": "Occitanie"
  },
  {
    "num_dep": 82,
    "dep_name": "Tarn-et-Garonne",
    "region_name": "Occitanie"
  },
  {
    "num_dep": 83,
    "dep_name": "Var",
    "region_name": "Provence-Alpes-Côte d'Azur"
  },
  {
    "num_dep": 84,
    "dep_name": "Vaucluse",
    "region_name": "Provence-Alpes-Côte d'Azur"
  },
  {
    "num_dep": 85,
    "dep_name": "Vendée",
    "region_name": "Pays de la Loire"
  },
  {
    "num_dep": 86,
    "dep_name": "Vienne",
    "region_name": "Nouvelle-Aquitaine"
  },
  {
    "num_dep": 87,
    "dep_name": "Haute-Vienne",
    "region_name": "Nouvelle-Aquitaine"
  },
  {
    "num_dep": 88,
    "dep_name": "Vosges",
    "region_name": "Grand Est"
  },
  {
    "num_dep": 89,
    "dep_name": "Yonne",
    "region_name": "Bourgogne-Franche-Comté"
  },
  {
    "num_dep": 90,
    "dep_name": "Territoire de Belfort",
    "region_name": "Bourgogne-Franche-Comté"
  },
  {
    "num_dep": 91,
    "dep_name": "Essonne",
    "region_name": "Île-de-France"
  },
  {
    "num_dep": 92,
    "dep_name": "Hauts-de-Seine",
    "region_name": "Île-de-France"
  },
  {
    "num_dep": 93,
    "dep_name": "Seine-Saint-Denis",
    "region_name": "Île-de-France"
  },
  {
    "num_dep": 94,
    "dep_name": "Val-de-Marne",
    "region_name": "Île-de-France"
  },
  {
    "num_dep": 95,
    "dep_name": "Val-d'Oise",
    "region_name": "Île-de-France"
  },
  {
    "num_dep": 971,
    "dep_name": "Guadeloupe",
    "region_name": "Guadeloupe"
  },
  {
    "num_dep": 972,
    "dep_name": "Martinique",
    "region_name": "Martinique"
  },
  {
    "num_dep": 973,
    "dep_name": "Guyane",
    "region_name": "Guyane"
  },
  {
    "num_dep": 974,
    "dep_name": "La Réunion",
    "region_name": "La Réunion"
  },
  {
    "num_dep": 976,
    "dep_name": "Mayotte",
    "region_name": "Mayotte"
  }
]

french_regions = list(set(dep["region_name"] for dep in french_departments))

class Cable(TypedDict):
    name: str
    data_source: str
    section: float
    diameter: float
    young_modulus: float
    linear_weight: float
    dilatation_coefficient: float
    temperature_reference: float
    stress_strain_a0: float
    stress_strain_a1: float
    stress_strain_a2: float
    stress_strain_a3: float
    stress_strain_a4: float
    stress_strain_b0: float
    stress_strain_b1: float
    stress_strain_b2: float
    stress_strain_b3: float
    stress_strain_b4: float

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
    maintenance_center_names: list[str]
    

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
        "support_ground_y": 0,
        "attachment_type": random.choice(["Suspension", "Tension", "Anchor"]),
        "attachment_set": f"AS-{random.randint(100, 999)}",
        "attachment_set_z": random.uniform(20, 50),
        "attachment_set_x": random.uniform(-10, 10),
        "attachment_set_y": 0,
        "cross_arm_relative_altitude": random.uniform(20, 80),
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

def generate_section(index: int, maintenance_centers: list[MaintenanceCenter], regional_maintenance_centers: list[RegionalMaintenanceCenter]) -> Section:
    section_id = index + 1
    first_support = random.randint(1, 50)
    last_support = first_support + random.randint(5, 20)
    regional_maintenance_centers = [regional_maintenance_centers[random.randint(0, len(regional_maintenance_centers) - 1)]]
    regional_maintenance_center_names = [regional_maintenance_center["name"] for regional_maintenance_center in regional_maintenance_centers]
    maintenance_center_names = regional_maintenance_centers[0]["maintenance_center_names"][0:random.randint(1, 3)]
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
        "regional_maintenance_center_names": regional_maintenance_center_names,
        "maintenance_center_names": maintenance_center_names,
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

def generate_maintenance_centers() -> list[MaintenanceCenter]:
    return[ {
        "uuid": generate_uuid(),
        "internal_id": f"MC-{department['num_dep']}",
        "name": f"{department['dep_name']}",
        "created_at": generate_timestamp(),
        "updated_at": generate_timestamp(),
    } for department in french_departments]

def generate_regional_maintenance_centers(maintenance_centers: list[MaintenanceCenter]) -> list[RegionalMaintenanceCenter]:
    centers = [
        {
            "uuid": generate_uuid(),
            "internal_id": f"RMC-{i}",
            "name": f"{region}",
            "created_at": generate_timestamp(),
            "updated_at": generate_timestamp(),
            "maintenance_center_names": [department["dep_name"] for department in french_departments if department["region_name"] == region],
        } for i, region in enumerate(french_regions)
    ]
    return centers

def generate_mock_data(count: int = 10):
    maintenance_centers = generate_maintenance_centers()
    regional_maintenance_centers = generate_regional_maintenance_centers(maintenance_centers)
    data = {
        "attachments": [generate_attachment(i) for i in range(count)],
        "branches": [generate_branch(i) for i in range(count)],
        "sections": [generate_section(i, maintenance_centers, regional_maintenance_centers) for i in range(count)],
        "transit_links": [generate_transit_link(i) for i in range(count)],
        "tensions": [generate_tension(i) for i in range(count)],
        "spans": [generate_span(i) for i in range(count)],
        "lines": [generate_line(i) for i in range(count)],
        "maintenance_centers": maintenance_centers,
        "regional_maintenance_centers": regional_maintenance_centers,
        "cables": cables,
    }
    return data

if __name__ == "__main__":
    # Generate mock data
    print("Generating mock data...")
    mock_data = generate_mock_data(50)
    print("Mock data generated")
    
    # Save to JSON file relative to the current file create file if it doesn't exist
    file_path = os.path.join(os.path.dirname(__file__), "../src/app/core/store/database/mock_data.json")
    if not os.path.exists(file_path):
        with open(file_path, "a") as f:
            json.dump(mock_data, f, indent=2)
    else:
        with open(file_path, "w+") as f:
            json.dump(mock_data, f, indent=2)
    
    print(f"Mock data generated and saved to mock_data.json")
    