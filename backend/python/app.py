import streamlit as st
import pandas as pd
from streamlit_autorefresh import st_autorefresh
import sys
import os

# Aggiungo la root backend/python in modo da importare database_manager facilmente
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database_manager import DatabaseManager
from config import SensorConfig
from layout import render_sidebar
from charts import render_sensor_charts

st.set_page_config(page_title="Sensor Dashboard", layout="wide")

st.title("Digital Twin Analytics Dashboard")

# Render della colonna laterale e recupero scelte
autorefresh_on, refresh_interval, time_range_minutes, record_limit = render_sidebar()

# Inizializzo l'Auto-Refresh
if autorefresh_on:
    # La chiave 'data_refresh' fa ricaricare solo il container all'interval settato
    st_autorefresh(interval=refresh_interval * 1000, key="data_refresh")

# Funzione in cache per evitare query duplicate nei reruns spuri di Streamlit
@st.cache_data(ttl=refresh_interval if autorefresh_on else 60)
def load_data(limit, time_range):
    db = DatabaseManager()
    if not db.client:
        db.connect()

    data = db.get_historical_data(limit=limit, time_range_minutes=time_range)

    if data:
        # Appiattimento dei metadati dalla Time Series per visualizzazione tabellare Pandas
        flattened = []
        for d in data:
            flat = {
                "timestamp": d["timestamp"],
                "value": d["value"],
                "isCritical": d.get("isCritical", False)
            }
            # Estrazione sicura dei metaField mongodb
            flat.update(d.get("metadata", {}))
            flattened.append(flat)

        return pd.DataFrame(flattened)
    return pd.DataFrame()

# Caricamento del Dataframe e Rendering UI
df = load_data(record_limit, time_range_minutes)

if df.empty:
    st.warning("No data found in the database. Ensure the simulator is running.")
else:
    render_sensor_charts(df, SensorConfig.SENSORS)

