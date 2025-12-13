def test_processes_list(client):
    r = client.get("/api/processes")
    assert r.status_code == 200

    data = r.get_json()
    assert "items" in data
    assert isinstance(data["items"], list)

def test_processes_have_fields(client):
    r = client.get("/api/processes")
    proc = r.get_json()["items"][0]

    assert "pid" in proc
    assert "name" in proc
    assert "cpu" in proc
    assert "ram" in proc
