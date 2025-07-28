from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL - supports both PostgreSQL and SQLite for development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./building_plans.db")

# For PostgreSQL with PostGIS:
# DATABASE_URL = "postgresql://username:password@localhost/building_plans"

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database with sample data"""
    from models import ZoningRule
    
    db = SessionLocal()
    
    # Add sample zoning rules if they don't exist
    if not db.query(ZoningRule).first():
        zoning_rules = [
            # R1 Residential
            ZoningRule(zone_type="R1", road_width=6.0, max_fsi=1.0, max_coverage=60, 
                      min_front_setback=3.0, min_rear_setback=2.0, min_side_setback=1.5, max_height=10.0),
            ZoningRule(zone_type="R1", road_width=9.0, max_fsi=1.2, max_coverage=65, 
                      min_front_setback=3.0, min_rear_setback=2.0, min_side_setback=1.5, max_height=12.0),
            
            # R2 Residential
            ZoningRule(zone_type="R2", road_width=6.0, max_fsi=1.2, max_coverage=65, 
                      min_front_setback=3.0, min_rear_setback=2.5, min_side_setback=2.0, max_height=15.0),
            ZoningRule(zone_type="R2", road_width=9.0, max_fsi=1.5, max_coverage=70, 
                      min_front_setback=3.0, min_rear_setback=2.5, min_side_setback=2.0, max_height=18.0),
            
            # Commercial
            ZoningRule(zone_type="C1", road_width=9.0, max_fsi=2.0, max_coverage=75, 
                      min_front_setback=4.0, min_rear_setback=3.0, min_side_setback=2.5, max_height=25.0),
            ZoningRule(zone_type="C2", road_width=12.0, max_fsi=2.5, max_coverage=80, 
                      min_front_setback=5.0, min_rear_setback=4.0, min_side_setback=3.0, max_height=35.0),
        ]
        
        for rule in zoning_rules:
            db.add(rule)
        
        db.commit()
    
    db.close()