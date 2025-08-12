#!/usr/bin/env python
"""
Fetch Hugging Face dataset and save to CSV using the datasets library.

Setup:
    1. Create a virtual environment:
       uv venv
    
    2. Install dependencies:
       uv pip install datasets pandas
    
    3. Run the script:
       uv run python scripts/fetch_huggingface_dataset.py
       
       Or with force refresh:
       uv run python scripts/fetch_huggingface_dataset.py --force

This will fetch the entire synthetic_profiles_ver_1 dataset (~58k rows)
from Hugging Face and save it to public/synthetic_profiles.csv
"""

from datasets import load_dataset
import pandas as pd
import json
import sys

def fetch_dataset(force_refresh=False):
    print("Loading dataset from Hugging Face...")
    
    # Load the dataset (this will cache it locally)
    dataset = load_dataset("zijuncheng/synthetic_profiles_ver_1", split="train")
    
    print(f"Dataset loaded: {len(dataset)} rows")
    
    # Convert to pandas DataFrame
    df = pd.DataFrame(dataset)
    
    # Select only the columns we need for the CSV (matching the original format)
    columns_to_keep = [
        'persona', 'visit_id', 'visit_time', 'visit_description', 
        'place_id', 'url', 'title', 'domain', 'visit_count', 
        'interest', 'title_name'
    ]
    
    # Filter to only columns that exist
    available_columns = [col for col in columns_to_keep if col in df.columns]
    df = df[available_columns]
    
    # Save to CSV
    output_path = "public/synthetic_profiles.csv"
    df.to_csv(output_path, index=False)
    print(f"Saved {len(df)} rows to {output_path}")
    
    # Show unique personas
    unique_personas = df['persona'].unique()
    print(f"Unique personas found: {sorted(unique_personas)}")
    print(f"Persona distribution:")
    print(df['persona'].value_counts())
    
    # Generate profiles.json
    generate_profiles(df)

def generate_profiles(df):
    """Generate profiles.json from the dataframe."""
    print("\nGenerating profiles.json...")
    
    # Get unique personas
    personas = df['persona'].unique()
    
    # Create a dictionary to hold all profiles
    all_profiles = {}
    
    for persona in sorted(personas):
        # Filter data for this persona
        persona_df = df[df['persona'] == persona]
        
        # Create profile data in the same format as theo.json
        profile_data = {}
        
        # Group by URL to aggregate visits
        url_groups = persona_df.groupby('url')
        
        for url, group in url_groups:
            # Get the most recent visit
            latest_visit = group.sort_values('visit_time', ascending=False).iloc[0]
            
            # Count total visits for this URL
            visit_count = len(group)
            
            # Determine if bookmarked (URLs visited 3+ times are bookmarked)
            bookmarked = visit_count >= 3
            
            profile_data[url] = {
                "title": latest_visit.get('title', ''),
                "visits": visit_count,
                "bookmarked": bookmarked,
                "lastVisitTime": latest_visit.get('visit_time', '')
            }
        
        # Add persona to the main profiles dictionary
        all_profiles[persona.lower()] = profile_data
        print(f"  - {persona}: {len(profile_data)} unique URLs")
    
    # Save to profiles.json
    output_path = 'public/profiles.json'
    with open(output_path, 'w') as f:
        json.dump(all_profiles, f, indent=2)
    
    print(f"\nSaved all profiles to {output_path}")

if __name__ == "__main__":
    force = "--force" in sys.argv or "-f" in sys.argv
    fetch_dataset(force)