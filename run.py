from flask import Flask, jsonify
import pandas as pd
import json

app = Flask(__name__)

def load_data():
    # Load the cleaned data from CSV file
    df = pd.read_csv('cleaned_data_final.csv')
    
    # Extract year from 'thời_điểm_thi' (e.g. "đợt 3/2024" -> 2024)
    df['năm'] = df['thời_điểm_thi'].str.extract(r'/(\d{4})').astype(int)
    
    # Clean up some columns
    df['kết_quả'] = df['kết_quả'].fillna('không rõ')  # Fill missing results with 'không rõ'
    df['mức_đạt'] = pd.to_numeric(df['mức_đạt'], errors='coerce')  # Convert scores to numeric
    df['nhóm_thi_sát_hạch'] = df['nhóm_thi_sát_hạch'].str.upper()  # Convert group names to uppercase
    
    # Convert DataFrame to dictionary format for JSON response
    return df.to_dict(orient='records')

@app.route('/')
def get_raw_data():
    # Endpoint to return raw data as JSON
    data = load_data()
    
    # Convert to JSON with proper encoding
    readable_data = json.dumps(data, ensure_ascii=False)  # Ensure ASCII is not forced, keeping original characters
    
    return readable_data  # Return the readable JSON string

if __name__ == '__main__':
    # Run the Flask app on port 5001
    app.run(port=5001, debug=True) 