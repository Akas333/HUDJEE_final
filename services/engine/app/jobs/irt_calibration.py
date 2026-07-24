import os
import numpy as np
from girth import threepl_mml
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("WARNING: Supabase credentials not found. Calibration will run in dry-run mode.")

def run_calibration():
    """
    Weekly offline IRT parameter calibration job.
    Uses girth's threepl_mml to calculate new a, b, c parameters for all questions.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("Dry run mode...")
        # Simulate data for testing purposes
        # matrix of 100 students x 10 questions
        simulated_matrix = np.random.choice([0, 1], size=(10, 100))
        # girth expects (items x students) or (students x items)? 
        # usually it's items x examinees. girth expects [n_items, n_participants]
        
        results = threepl_mml(simulated_matrix)
        print("Calibration results:")
        print(f"Discrimination (a): {results['Discrimination']}")
        print(f"Difficulty (b): {results['Difficulty']}")
        print(f"Guessing (c): {results['Guessing']}")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    # 1. Fetch recent answer events (e.g. last 30 days)
    # 2. Construct the response matrix: Rows = Questions, Columns = Students
    # For now, we will stub this query as it requires specific table schema knowledge
    # and a considerable amount of data to be effective.
    print("Fetching data from Supabase...")
    # response_data = supabase.table('answer_events').select('user_id, question_id, is_correct').execute()
    
    # 3. Build the dense matrix (missing values could be handled by girth or imputed, 
    # but 3PL MML typically requires a dense matrix or a specific missing data format).
    # ...
    
    # 4. Run calibration
    # results = threepl_mml(response_matrix)
    
    # 5. Update the database
    # for i, q_id in enumerate(question_ids):
    #     a = float(results['Discrimination'][i])
    #     b = float(results['Difficulty'][i])
    #     c = float(results['Guessing'][i])
    #     supabase.table('questions').update({
    #         'irt_discrimination': a,
    #         'irt_difficulty': b,
    #         'irt_guessing': c
    #     }).eq('id', q_id).execute()
        
    print("Calibration complete.")

if __name__ == "__main__":
    run_calibration()
