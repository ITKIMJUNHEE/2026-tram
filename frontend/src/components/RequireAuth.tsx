import { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuthToken, isTokenExpired, setAuthToken } from '../api/client';

interface RequireAuthProps {
  children: ReactElement;
}

/**
 * 저장된 토큰이 없거나 만료됐으면 로그인 페이지(/)로 리다이렉트하는 라우트 가드.
 * /simulation, /prediction처럼 관제 담당자 전용 화면에 씌운다.
 */
const RequireAuth = ({ children }: RequireAuthProps) => {
  const token = getAuthToken();

  if (!token || isTokenExpired(token)) {
    setAuthToken(null);
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RequireAuth;
