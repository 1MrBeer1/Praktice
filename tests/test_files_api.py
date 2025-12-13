def test_files_list_root(client):
    r = client.get("/api/files?path=/")
    assert r.status_code == 200
    data = r.get_json()
    assert "items" in data

def test_create_and_delete_file(client):
    # создать файл
    r = client.post("/api/files", json={
        "path": "/",
        "name": "test_file.txt",
        "content": "hello"
    })
    assert r.status_code == 200

    # проверить чтение
    r = client.get("/api/files/read?path=/test_file.txt")
    assert r.status_code == 200
    assert r.get_json()["content"] == "hello"

    # удалить
    r = client.post("/api/files/delete", json={
        "path": "/test_file.txt"
    })
    assert r.status_code == 200
