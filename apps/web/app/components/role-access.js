const STAFF_ROLES = new Set(['STAFF', 'MANAGER']);
const APP_ORIGIN = 'http://brewlite.local';

export function isStaffSession(session) {
  return STAFF_ROLES.has(session?.account?.role);
}

function isSafeCustomerDestination(path) {
  if (
    typeof path !== 'string' ||
    !path.startsWith('/') ||
    path.includes('\\')
  ) {
    return false;
  }

  try {
    const destination = new URL(path, APP_ORIGIN);
    const pathname = decodeURIComponent(destination.pathname);

    return (
      destination.origin === APP_ORIGIN &&
      pathname !== '/staff' &&
      !pathname.startsWith('/staff/')
    );
  } catch {
    return false;
  }
}

export function getPostAuthDestination(session, requestedNext) {
  if (isStaffSession(session)) return '/staff/orders';
  return isSafeCustomerDestination(requestedNext) ? requestedNext : '/';
}
