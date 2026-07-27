import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, AlertCircle } from 'lucide-react';
import './LoginPage.css'; // 스타일 파일
import { login, setAuthToken } from './api/client';

interface Credentials {
  id: string;
  password: string;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<Credentials>({ id: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    try {
      const { token } = await login(credentials.id, credentials.password);
      setAuthToken(token);
      navigate('/admin'); // 관리자 대시보드로 이동
    } catch {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-overlay"></div>

      {/* 중앙 로그인 박스 */}
      <div className="login-box">
        <div className="login-header">
          <div className="logo-area">
            <ShieldCheck size={40} className="logo-icon" />
            <div className="logo-text">
              <h1>대전 트램 정책 지원 시스템</h1>
              <p>Daejeon Tram Policy Support System</p>
            </div>
          </div>
          <div className="header-badge">행정망 전용</div>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>행정 ID</label>
            <div className="input-wrapper">
              <User size={20} />
              <input
                type="text"
                name="id"
                placeholder="아이디를 입력하세요 (admin)"
                value={credentials.id}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="input-group">
            <label>비밀번호</label>
            <div className="input-wrapper">
              <Lock size={20} />
              <input
                type="password"
                name="password"
                placeholder="비밀번호를 입력하세요"
                value={credentials.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && <div className="error-msg"><AlertCircle size={14}/> {error}</div>}

          <button type="submit" className="login-btn">로그인</button>

          <div className="divider">
            <span>또는</span>
          </div>

          {/* GPKI 인증 버튼 (디자인용) */}
          <button type="button" className="gpki-btn" onClick={() => alert("GPKI 인증 모듈을 로딩합니다...")}>
            <ShieldCheck size={16} /> GPKI 공인인증서 로그인
          </button>
        </form>

        <div className="login-footer">
          <p>※ 본 시스템은 인가된 담당자만 이용 가능합니다.</p>
          <p>불법 접속 시 정보통신망법에 의해 처벌될 수 있습니다.</p>
          <div className="copyright">Copyright © DAEJEON METROPOLITAN CITY. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
