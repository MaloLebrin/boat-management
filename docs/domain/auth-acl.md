# Domaine — Auth & ACL

## Auth (signup/login/logout)

Référence routes: `start/routes/auth.ts`.

### Signup

- `GET /signup` (guest-only)
  - Controller: `app/controllers/new_account_controller.ts` → `create`
  - Page: `inertia/pages/auth/signup.vue`
- `POST /signup` (guest-only)
  - Controller: `NewAccountController.store`
  - Validation: `signupValidator` (`app/validators/user.ts`)
  - Service: `UserService.signupWithOrganization`
  - Auth: `auth.use('web').login(user)`
  - Redirect: route `home`

### Login

- `GET /login` (guest-only)
  - Controller: `app/controllers/session_controller.ts` → `create`
  - Page: `inertia/pages/auth/login.vue`
- `POST /login` (guest-only)
  - Controller: `SessionController.store`
  - `User.verifyCredentials(email, password)`
  - `auth.use('web').login(user)`
  - Redirect: route `home`

### Logout

- `POST /logout` (auth-only)
  - Controller: `SessionController.destroy`
  - `auth.use('web').logout()`
  - Redirect: route `session.create`

## Home vs dashboard

Référence: `app/controllers/home_controller.ts`.

- non-auth → render Inertia `home`
- auth → render Inertia `dashboard` avec data du `DashboardService`

## ACL (Bouncer)

Références:
- abilities: `app/abilities/main.ts`
- middleware: `app/middleware/initialize_bouncer_middleware.ts`

Abilities existantes:

- `boatView(boat)`
- `boatCreate()`
- `boatUpdate(boat)`
- `boatDelete(boat)`

Règle: **même organisation** (ou “appartient à une org” pour create).

