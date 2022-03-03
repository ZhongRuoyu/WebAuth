async function digestMessage(message) {
    const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest("SHA-512", msgUint8);           // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join(""); // convert bytes to hex string
    return hashHex;
}

async function invalidateSessions(username) {
    const sessions = await SESSIONS.list();
    for (const session of sessions.keys) {
        const sessionId = session.name;
        const sessionUsername = await SESSIONS.get(sessionId);
        if (sessionUsername === username) {
            await SESSIONS.delete(sessionId);
        }
    }
}



addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const requestMethod = request.method;
    if (requestMethod !== "POST") {
        return new Response("method not allowed", { status: 405 });
    }
    const params = await request.text().then(text => new URLSearchParams(text));
    const requestType = params.get("request_type");
    if (requestType === null) {
        return new Response("bad request", { status: 400 });
    }

    switch (requestType) {
        case "new_user": {
            const username = params.get("username");
            const password = params.get("password");
            const ipAddress = request.headers.get("CF-Connecting-IP");
            if (username === null || username === "" ||
                password === null || password === "") {
                return new Response("bad request", { status: 400 });
            }
            const user = await AUTH.get(username);
            if (user !== null) {
                return new Response("user exists", { status: 406 });
            }
            const array = crypto.getRandomValues(new Uint8Array(8));
            const salt = btoa(array);
            const saltedPassword = password + salt;
            const hash = await digestMessage(saltedPassword);
            await AUTH.put(username, JSON.stringify({
                username: username,
                salt: salt,
                hash: hash,
                ip_address: ipAddress,
            }));
            return new Response("success", { status: 200 });
        }
        case "auth_user": {
            const username = params.get("username");
            const password = params.get("password");
            if (username === null || username === "" ||
                password === null || password === "") {
                return new Response("bad request", { status: 400 });
            }
            const user = await AUTH.get(username);
            if (user === null) {
                return new Response("user does not exist", { status: 406 });
            }
            const { salt, hash } = JSON.parse(user);
            const saltedPassword = password + salt;
            const hashResult = await digestMessage(saltedPassword);
            if (hashResult === hash) {
                return new Response("success", { status: 200 });
            } else {
                return new Response("failure", { status: 401 });
            }
        }
        case "change_password": {
            const username = params.get("username");
            const password = params.get("password");
            const newPassword = params.get("new_password");
            if (username === null || username === "" ||
                password === null || password === "" ||
                newPassword === null || newPassword === "") {
                return new Response("bad request", { status: 400 });
            }
            const user = await AUTH.get(username);
            if (user === null) {
                return new Response("user does not exist", { status: 406 });
            }
            const { salt, hash } = JSON.parse(user);
            const oldSaltedPassword = password + salt;
            const hashResult = await digestMessage(oldSaltedPassword);
            if (hashResult === hash) {
                const array = crypto.getRandomValues(new Uint8Array(8));
                const newSalt = btoa(array);
                const newSaltedPassword = newPassword + newSalt;
                const newHash = await digestMessage(newSaltedPassword);
                await AUTH.put(username, JSON.stringify({
                    username: username,
                    salt: newSalt,
                    hash: newHash,
                }));
                await invalidateSessions(username);
                return new Response("success", { status: 200 });
            } else {
                return new Response("failure", { status: 401 });
            }
        }
        case "delete_user": {
            const username = params.get("username");
            const password = params.get("password");
            if (username === null || username === "" ||
                password === null || password === "") {
                return new Response("bad request", { status: 400 });
            }
            const user = await AUTH.get(username);
            if (user === null) {
                return new Response("success", { status: 200 });
            }
            const { salt, hash } = JSON.parse(user);
            const saltedPassword = password + salt;
            const hashResult = await digestMessage(saltedPassword);
            if (hashResult === hash) {
                await invalidateSessions(username);
                await AUTH.delete(username);
                return new Response("success", { status: 200 });
            } else {
                return new Response("failure", { status: 401 });
            }
        }
    }

    return new Response("bad request", { status: 400 });
}
