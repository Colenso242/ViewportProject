import streamlit as st

def render_sidebar():
    """
    Renderizza la barra dei controlli laterale.
    Restituisce le variabili necessarie alla query dei dati.
    """
    st.sidebar.header("Dashboard Controls")

    autorefresh_on = st.sidebar.toggle("Auto-refresh data", value=True)

    refresh_interval = st.sidebar.slider(
        "Refresh Interval (seconds)",
        min_value=2, max_value=60, value=5,
        disabled=not autorefresh_on
    )

    st.sidebar.divider()

    time_window = st.sidebar.selectbox(
        "Time Window",
        options=["Last 5 minutes", "Last 1 hour", "Last 24 hours", "All time"],
        index=0
    )

    time_map = {
        "Last 5 minutes": 5,
        "Last 1 hour": 60,
        "Last 24 hours": 1440,
        "All time": None
    }
    time_range_minutes = time_map[time_window]

    record_limit = st.sidebar.number_input(
        "Max Records to Fetch per Sensor",
        min_value=100, max_value=10000, value=1000
    )

    return autorefresh_on, refresh_interval, time_range_minutes, record_limit

