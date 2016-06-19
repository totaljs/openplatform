# OpenPlatform v1.0.0

__Login__:
- user: 123456
- password: 123456

---

## Documentation

1. How does the OpenPlatform work?
2. How does the application work in the OpenPlatform?
3. Server-Side communication
4. Client-Side communication
5. Widgets

### How does the OpenPlatform work?

The platform is a simple application which can manage 3rd applications and users + roles. Each application is executed in the HTML `iframe` but in the OpenPlatform's context. 3rd applications (if have privileges) can read users, applications or can create notifications or can communicate with other applications via service worker. The platform offers two ways for communication:

- server-side
- client-side via small [openplatform.js](https://github.com/totaljs/openplatform/blob/master/public/v1/openplatform.js) library

The OpenPlatform must have own hostname because 3rd applications communicate with the platform.

![OpenPlatform workbench](https://www.totaljs.com/img/openplatform/openplatform-auth.png)

### How does the application work in the OpenPlatform?