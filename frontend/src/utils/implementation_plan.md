# Implementation Plan: Secure Admin Pages with Role Verification on Mount/Refresh

Currently, admin pages only verify that a valid token exists inside `ensureAuth`. They do not check if the user's role is `"admin"`. This means normal users with a valid token could potentially navigate to the admin routes, and refreshing the admin pages does not guard against non-admin roles correctly.

We will update the `ensureAuth` function in all admin pages to synchronously check the role from `localStorage` (`localStorage.getItem("userRole") !== "admin"`) and redirect non-admin users to `/login`.

## Proposed Changes

We will modify the `ensureAuth` function in each of the following files:

### Admin Pages Role Verification

#### [MODIFY] [Users.jsx](file:///c:/Users/ahmad/OneDrive/سطح%20المكتب/testComponents%20copmpostions/frontend/frontend/src/pages/admin/Users.jsx)
Update `ensureAuth` to check `localStorage.getItem("userRole") !== "admin"`.

#### [MODIFY] [TopicsPage.jsx](file:///c:/Users/ahmad/OneDrive/سطح%20المكتب/testComponents%20copmpostions/frontend/frontend/src/pages/admin/TopicsPage.jsx)
Update `ensureAuth` to check `localStorage.getItem("userRole") !== "admin"`.

#### [MODIFY] [Tasks.jsx](file:///c:/Users/ahmad/OneDrive/سطح%20المكتب/testComponents%20copmpostions/frontend/frontend/src/pages/admin/Tasks.jsx)
Update `ensureAuth` to check `localStorage.getItem("userRole") !== "admin"`.

#### [MODIFY] [Settings.jsx](file:///c:/Users/ahmad/OneDrive/سطح%20المكتب/testComponents%20copmpostions/frontend/frontend/src/pages/admin/Settings.jsx)
Update `ensureAuth` to check `localStorage.getItem("userRole") !== "admin"`.

#### [MODIFY] [QuizQuestions.jsx](file:///c:/Users/ahmad/OneDrive/سطح%20المكتب/testComponents%20copmpostions/frontend/frontend/src/pages/admin/QuizQuestions.jsx)
Update `ensureAuth` to check `localStorage.getItem("userRole") !== "admin"`.

#### [MODIFY] [EditAdminProfile.jsx](file:///c:/Users/ahmad/OneDrive/سطح%20المكتب/testComponents%20copmpostions/frontend/frontend/src/pages/admin/EditAdminProfile.jsx)
Update `ensureAuth` to check `localStorage.getItem("userRole") !== "admin"`.

#### [MODIFY] [AdminTaskContent.jsx](file:///c:/Users/ahmad/OneDrive/سطح%20المكتب/testComponents%20copmpostions/frontend/frontend/src/pages/admin/AdminTaskContent.jsx)
Update `ensureAuth` to check `localStorage.getItem("userRole") !== "admin"`.

#### [MODIFY] [AdminProfile.jsx](file:///c:/Users/ahmad/OneDrive/سطح%20المكتب/testComponents%20copmpostions/frontend/frontend/src/pages/admin/AdminProfile.jsx)
Update `ensureAuth` to check `localStorage.getItem("userRole") !== "admin"`.

#### [MODIFY] [AdminDash.jsx](file:///c:/Users/ahmad/OneDrive/سطح%20المكتب/testComponents%20copmpostions/frontend/frontend/src/pages/admin/AdminDash.jsx)
Update `ensureAuth` to check `localStorage.getItem("userRole") !== "admin"`.

## Verification Plan

### Manual Verification
- Log in as a normal user and attempt to navigate directly to `/admin/dashboard` or other admin pages. Verify that you are redirected to `/login` with a session expired/expired registration warning.
- Log in as an admin, navigate to admin pages, and refresh. Verify that you are not redirected and remain on the page.
