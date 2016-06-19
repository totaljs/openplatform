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

![OpenPlatform workbench](https://www.totaljs.com/img/openplatform/openplatform-auth.png)

---

### How does the application work in the OpenPlatform?

Each 3rd application must contain `openplatform.json` file which it describes the whole application, its roles, icon and widgets. The full URL address to `openplatform.json` is the application identificator in the OpenPlatform. The platform downloads the content of file `openplatform.json` each 5 minutes.

```json
{
    "name": "TestApp",
    "version": "1.0.0",
    "icon": "http://openapp.totaljs.com/icon.png",
    "author": "Peter Širka",
    "email": "petersirka@gmail.com",

    // Optional.
    "description": "Some text for the super user.",

    // URL which is opened when the user click on the application's icon
    "url": "http://openapp.totaljs.com",

    // Optional. URL for obtaining session.
    "sessionurl": "http://openapp.totaljs.com/openplatform/",

    // Roles
    "roles": ["create", "read", "update"],

    // Optional.
    "widgets": [
        {
            // Widget's name
            "name": "Chart.js",

            // Widget generator
            "url": "http://openapp.totaljs.com/widgets/chartjs/",

            // Optional. When the user click on the widget then the OpenPlatform
            // redirects the iFrame to this URL address. Default: application "url"
            "redirect": "",

            // Optional. Widget's background color. Default: white
            "background": "white",

            // Optional. Widget's font color. Default: silver
            "color": "silver",

            // Optional. Size of widget "1" = 400x250, "2" = 600x250, "3" = 800x250.
            // Default: 1
            "size": 1,

            // Optional. Refresh interval, default 15000 (15 seconds). A minimal value
            // can be 15000.
            "interval": 15000
        }
    ],

    // Optional. Can contain IP addresses. The OpenPlatform checks origin IP when
    // the platform receives a server-side request from the application. It's simple
    // prevention for hijacking.
    "origin": ['10.77.50.11']
}
```