class RestAPI {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }

    get(path) {
        return this.fetch(this.endpoint + path);
    }

    post(path, data) {
        return this.fetch(this.endpoint + path, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
    }

    put(path, data) {
        return this.fetch(this.endpoint + path, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
    }

    delete(path) {
        return this.fetch(this.endpoint + path, {
            method: "DELETE"
        });
    }

    patch(path, data) {
        return this.fetch(this.endpoint + path, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
    }

    head(path) {
        return this.fetch(this.endpoint + path, {
            method: "HEAD"
        });
    }

    options(path) {
        return this.fetch(this.endpoint + path, {
            method: "OPTIONS"
        });
    }

    trace(path) {
        return this.fetch(this.endpoint + path, {
            method: "TRACE"
        });
    }

    connect(path) {
        return this.fetch(this.endpoint + path, {
            method: "CONNECT"
        });
    }

    request(method, path, data) {
        return this.fetch(this.endpoint + path, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
    }

    fetch(url, options = {}) {
        if (this.middleware) {
            const { url: _url, options: _options, error } = this.middleware(url, options);
            url = _url;
            options = _options;
            if (error) throw error;
        }

        return fetch(url, options).then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        });
    }
}

export default RestAPI;
