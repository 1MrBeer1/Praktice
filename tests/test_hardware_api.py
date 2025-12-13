def test_hardware_endpoint(client):
    r = client.get("/api/hardware")
    assert r.status_code == 200

    data = r.get_json()
    assert "basic" in data
    assert "metrics" in data
    assert "temps" in data

def test_hardware_metrics(client):
    r = client.get("/api/hardware")
    metrics = r.get_json()["metrics"]

    assert "cpu_percent" in metrics
    assert "ram_percent" in metrics
