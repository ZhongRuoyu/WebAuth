# WebAuth

WebAuth is an HTTPS-based authentication API which uses salted passwords with SHA-512 hashing to enhance security. It also provides basic support for session-based authentication.

## Usage

WebAuth can be incorporated into other web applications that require authentication. An example would be [LinkShortener](https://github.com/ZhongRuoyu/LinkShortener), a simple authorization-based URL shortener.

### Requests

The API can be called with HTTPS requests with `POST` method. The following parameters are required:

| Key            | Value                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `request_type` | The type of the request to be made. It can be one of the following: `new_user`, `auth_user`, `change_password`, `delete_user`.                                |
| `username`     | The username.                                                                                                                                                 |
| `password`     | The password.                                                                                                                                                 |
| `sessionId`    | The password.                                                                                                                                                 |
| `ttl`          | (Optional, for `auth_user` with username and password only) The session timeout. If supplied, the request generates a new session with the specified timeout. |
| `new_password` | (For `change_password` only) The new password.                                                                                                                |

Note: the validity of `ttl` is not checked. If `ttl` is not a valid number, it is ignored. If it is less than 60, then the session created will still last for 60 seconds.

### Responses

One of the following responses can be expected.

| Response status code     | Body                  | Description                                                                                       |
| ------------------------ | --------------------- | ------------------------------------------------------------------------------------------------- |
| `200 OK`                 | `success`             | The request is handled successfully.                                                              |
| `200 OK`                 | (Session ID)          | (For `auth_user` only) A new session is successfully created. The session ID is returned.         |
| `400 Bad Request`        | `bad request`         | The request is malformed. This can happen due to missing parameters or an invalid `request_type`. |
| `401 Unauthorized`       | `failure`             | (N/A for `new_user`) The credentials supplied are invalid.                                        |
| `405 Method Not Allowed` | `method not allowed`  | The request uses a method other than `POST`. Only `POST` methods are accepted.                    |
| `406 Not Acceptable`     | `user exists`         | (For `new_user` only) The new user cannot be created because the username already exists.         |
| `406 Not Acceptable`     | `user does not exist` | (N/A for `new_user`) The user cannot be authorized/deleted because it does not exist.             |

A session ID is a random 128-bit UUID in this format: `00112233-4455-6677-8899-aabbccddeeff`.

## Deployment

WebAuth is designed to deploy on [Cloudflare Workers](https://workers.cloudflare.com), but it can also be deployed on other platforms (or even your own server) with some adaptation. Below are instructions for deploying it on Cloudflare Workers.

### Installing Wrangler

If you do not have Wrangler installed, install it first. To install with `npm`:

```bash
npm i @cloudflare/wrangler -g
```

Other installation instructions can be found [here](https://developers.cloudflare.com/workers/cli-wrangler/install-update/). With Wrangler installed, you also need to authenticate yourself ([instructions](https://developers.cloudflare.com/workers/cli-wrangler/authentication/)).

### Configuring KV Namespaces

Cloudflare Workers KV is a key-value data store, and it is used by WebAuth to store the session information as well as passwords (securely, for sure).

Create the following KV namespaces:

```bash
wrangler kv:namespace create "AUTH"
wrangler kv:namespace create "SESSIONS"
```

`AUTH` is for storage of user data, and `SESSIONS` stores the information of all the active sessions.

For each namespace created, put its configuration into [`wrangler.toml`](wrangler.toml).

### Publishing the Worker

Finally, the Worker can be published:

```bash
wrangler publish
```

## License

Copyright (c) 2022 Zhong Ruoyu. Licensed under [the MIT License](LICENSE).
