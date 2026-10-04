import { useCallback, useEffect, useState } from 'react';
import { listUsers, setUserApproval, setUserPermission } from '../utils/cloudSync';

/**
 * لوحة المشرف: قائمة الحسابات والموافقة عليها.
 * users = null أثناء التحميل الأوّل.
 */
export default function useAdminUsers() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [busyUser, setBusyUser] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await listUsers();
      setUsers(list);
      setError('');
    } catch {
      setError('تعذّر تحميل المستخدمين — تحقّق من الاتصال');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setApproval = useCallback(async (user, approved) => {
    setBusyUser(user);
    setError('');
    try {
      await setUserApproval(user, approved);
      setUsers(prev => prev.map(u => (u.user === user ? { ...u, approved } : u)));
    } catch {
      setError('تعذّر الحفظ — تحقّق من الاتصال');
    } finally {
      setBusyUser(null);
    }
  }, []);

  // صلاحية لحساب بعينه (مثل hifzCustomStart)
  const setPermission = useCallback(async (user, permission, allowed) => {
    setBusyUser(user);
    setError('');
    try {
      await setUserPermission(user, permission, allowed);
      setUsers(prev => prev.map(u => (u.user === user ? { ...u, [permission]: allowed } : u)));
    } catch {
      setError('تعذّر الحفظ — تحقّق من الاتصال');
    } finally {
      setBusyUser(null);
    }
  }, []);

  return { users, error, busyUser, setApproval, setPermission };
}
