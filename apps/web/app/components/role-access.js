const STAFF_ROLES = new Set(['STAFF', 'MANAGER']);

export function isStaffSession(session) {
  return STAFF_ROLES.has(session?.account?.role);
}

function isSafeCustomerDestination(path) {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    path !== '/staff' &&
    !path.startsWith('/staff/')
  );
}

export function getPostAuthDestination(session, requestedNext) {
  if (isStaffSession(session)) return '/staff/orders';
  return isSafeCustomerDestination(requestedNext) ? requestedNext : '/';
}
