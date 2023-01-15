# OpenPlatform v5

- [Documentation](https://docs.totaljs.com/openplatform/)
- [Join Total.js Telegram](https://t.me/totaljs)
- [Support](https://www.totaljs.com/support/)

OpenPlatform is a simple enterprise-ready platform for running, integrating and managing multiple web applications.

![OpenPlatform](https://docs.totaljs.com/download/xav3001kb41d-1si7hid-640x492-1.gif)

## Installation

__Manual installation__:

- Install latest version of [__Node.js platform__](https://nodejs.org/en/)
- Install PostgreSQL
- Create a database for the OpenPlatform
- Install NPM dependencies via terminal `$ npm install` in the root of application
- Update connection strings in `/config` file
- [Download __Source-Code__](https://github.com/totaljs/openplatform)
- Run it `$ node index.js`
- Open `http://127.0.0.1:8000` in your web browser
- __IMPORTANT__: Then open settings and configure the platform

__Docker Hub__:

```bash
docker pull totalplatform/openplatform
docker run --env DATABASE='postgresql://user:pass@hostname/database' -p 8000:8000 totalplatform/openplatform
````

__Docker Compose__:

```bash
docker-compose up
````

## Default credentials

```html
login : info@totaljs.com
password : admin
```