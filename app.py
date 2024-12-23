from flask import Flask, render_template, jsonify, request
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
import json

app = Flask(__name__)

def load_data():
    df = pd.read_csv('cleaned_data_final.csv')
    
    # Extract year from thời_điểm_thi (e.g. "đợt 3/2024" -> 2024)
    df['năm'] = df['thời_điểm_thi'].str.extract(r'/(\d{4})').astype(int)
    
    # Clean up some columns
    df['kết_quả'] = df['kết_quả'].fillna('không rõ')
    df['mức_đạt'] = pd.to_numeric(df['mức_đạt'], errors='coerce')
    df['nhóm_thi_sát_hạch'] = df['nhóm_thi_sát_hạch'].str.upper()
    
    return df

@app.route('/')
def index():
    df = load_data()
    
    # Get unique values for filters
    years = sorted(df['năm'].unique().tolist())
    positions = sorted(df['vị_trí_công_tác_hiện_tại'].unique().tolist())
    test_positions = sorted(df['vị_trí_sát_hạch'].unique().tolist())
    employee_ids = sorted(df['mã_sinh_viên'].unique().tolist())
    birthplaces = sorted(df['nơi_sinh'].unique().tolist())
    results = sorted(df['kết_quả'].unique().tolist())
    scores = sorted([3, 4, 5])  # Fixed scores as per requirement
    
    return render_template('index.html', 
                         years=years,
                         positions=positions,
                         test_positions=test_positions,
                         employee_ids=employee_ids,
                         birthplaces=birthplaces,
                         results=results,
                         scores=scores)

@app.route('/get_data')
def get_data():
    df = load_data()
    filters = json.loads(request.args.get('filters', '{}'))
    
    # Apply filters
    if filters.get('years') and len(filters['years']) > 0:
        df = df[df['năm'].isin(filters['years'])]
    if filters.get('positions') and len(filters['positions']) > 0:
        df = df[df['vị_trí_công_tác_hiện_tại'].isin(filters['positions'])]
    if filters.get('testPositions') and len(filters['testPositions']) > 0:
        df = df[df['vị_trí_sát_hạch'].isin(filters['testPositions'])]
    if filters.get('employeeIds') and len(filters['employeeIds']) > 0:
        df = df[df['mã_sinh_viên'].astype(str).isin([str(id) for id in filters['employeeIds']])]
    if filters.get('birthplaces') and len(filters['birthplaces']) > 0:
        df = df[df['nơi_sinh'].isin(filters['birthplaces'])]
    if filters.get('results') and len(filters['results']) > 0:
        df = df[df['kết_quả'].isin(filters['results'])]
    if filters.get('scores') and len(filters['scores']) > 0:
        df = df[df['mức_đạt'].astype(float).isin([float(score) for score in filters['scores']])]
    
    # Calculate filtered metrics
    yearly_avg = df.groupby('năm')['mức_đạt'].mean().round(2).to_dict()
    
    # Explicitly calculate group averages for all groups
    group_avg = (df.groupby('nhóm_thi_sát_hạch')['mức_đạt']
                  .agg(['mean', 'count'])  # Get both mean and count
                  .round(2)['mean']  # Round mean to 2 decimals
                  .to_dict())
    
    # Sort groups by average score
    sorted_groups = dict(sorted(group_avg.items(), key=lambda x: x[1], reverse=True))
    print("All groups:", df['nhóm_thi_sát_hạch'].unique())  # Debug print
    print("Group counts:", df['nhóm_thi_sát_hạch'].value_counts())  # Debug print
    print("Sorted groups:", sorted_groups)  # Debug print
    
    pass_fail = df['kết_quả'].value_counts().to_dict()
    total = sum(pass_fail.values())
    pass_fail_pct = {k: round(v/total * 100, 2) for k, v in pass_fail.items()}

    return jsonify({
        'yearly_avg': yearly_avg,
        'group_avg': sorted_groups,  # Send the sorted dictionary
        'pass_fail': pass_fail_pct,
        'total_candidates': len(df),
        'pass_rate': round((df['kết_quả'] == 'đạt').mean() * 100, 2)
    })

if __name__ == '__main__':
    app.run(debug=True)