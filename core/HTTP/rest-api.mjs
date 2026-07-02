class RestAPI {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }

    get(path) {
        return fetch(this.endpoint + path);
    }

    post(path, data) {
        return fetch(this.endpoint + path, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
    }

    put(path, data) {
        return fetch(this.endpoint + path, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
    }

    delete(path) {
        return fetch(this.endpoint + path, {
            method: "DELETE"
        });
    }

    patch(path, data) {
        return fetch(this.endpoint + path, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
    }

    head(path) {
        return fetch(this.endpoint + path, {
            method: "HEAD"
        });
    }

    options(path) {
        return fetch(this.endpoint + path, {
            method: "OPTIONS"
        });
    }

    trace(path) {
        return fetch(this.endpoint + path, {
            method: "TRACE"
        });
    }

    connect(path) {
        return fetch(this.endpoint + path, {
            method: "CONNECT"
        });
    }

    request(method, path, data) {
        return fetch(this.endpoint + path, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
    }
}

export default RestAPI;
