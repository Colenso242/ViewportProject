import streamlit as st

def render_sensor_charts(df, sensors_config):
    """
    Renderizza una GUI per ogni tipologia di sensore tramite tab separate.
    """
    sensor_ids = list(df["sensorId"].unique()) if "sensorId" in df.columns else []

    if not sensor_ids:
        st.info("No sensor records available in the query window.")
        return

    # Tabs generation
    tabs = st.tabs(sensor_ids)

    for i, s_id in enumerate(sensor_ids):
        with tabs[i]:
            sensor_data = df[df["sensorId"] == s_id].copy()
            if sensor_data.empty:
                st.write("No data found for this window.")
                continue

            sensor_data.set_index("timestamp", inplace=True)

            # Retrieving sensor properties
            s_conf = next((s for s in sensors_config if s["id"] == s_id), None)
            unit = s_conf["unit"] if s_conf else ""

            # Key Performance Indicators
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Latest Value", f"{sensor_data['value'].iloc[-1]:.2f} {unit}")
            with col2:
                st.metric("Max Value (Window)", f"{sensor_data['value'].max():.2f} {unit}")
            with col3:
                critical_count = sensor_data["isCritical"].sum()
                st.metric("Critical Read Windows", int(critical_count))

            # Chart Rendering
            st.subheader(f"Historical Trend for {s_id}")

            # Disegniamo la Threshold Line (se configurata)
            if s_conf and "threshold" in s_conf:
                sensor_data["Threshold"] = s_conf["threshold"]
                st.line_chart(sensor_data[["value", "Threshold"]])
            else:
                st.line_chart(sensor_data["value"])

