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

    eventStream(path, payload) {
        const endpoint = this.endpoint;

        function _parseEvent(rawBlock) {
            let data = "";
            for (const line of rawBlock.split("\n")) {
                if (line.startsWith("data:")) {
                    data += (data ? "\n" : "") + line.replace("data:", "").trim();
                }
            }
            return { data };
        }
        async function* stream() {
            const controller = new AbortController();

            const response = await fetch(`${endpoint}${path}`, {
                method: "GET",
                headers: { "Content-Type": "text/event-stream" },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const parts = buffer.split("\n\n");
                    buffer = parts.pop() || "";

                    for (const part of parts) {
                        if (!part.trim()) continue;

                        // Use "this" to call helper methods within the class
                        yield _parseEvent(part);
                    }
                }
            } finally {
                reader.releaseLock();
            }
        }

        return {
            stream: stream(),
            close: () => controller.abort()
        };
    }

    // Private class helper for parsing
}

export default RestAPI;
