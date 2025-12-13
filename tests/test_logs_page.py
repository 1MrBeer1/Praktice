def test_logs_page_render(client):
    r = client.get("/logs")
    assert r.status_code == 200
    assert b"logs" in r.data.lower()
