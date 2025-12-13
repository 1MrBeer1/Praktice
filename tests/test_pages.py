def test_index_page(client):
    r = client.get("/")
    assert r.status_code == 200

def test_files_page(client):
    r = client.get("/files")
    assert r.status_code == 200

def test_processes_page(client):
    r = client.get("/processes")
    assert r.status_code == 200

def test_logs_page(client):
    r = client.get("/logs")
    assert r.status_code == 200
