import { Component } from 'react';

import './ErrorBoundary.css';

/**
 * 路由级错误边界。
 * ---------------------------------------------------------------------------
 * 为什么用 class：只有 class 组件能实现 componentDidCatch / getDerivedStateFromError，
 * 函数组件没有等价的 Hook。
 *
 * 边界放在「路由出口」而不是最外层，这样导航和页脚不会跟着一起消失 ——
 * 某个页面崩了，用户仍然可以点到别的页面去，而不是面对整片白屏。
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // 真实项目这里应该上报到 Sentry 之类的平台；
    // 本项目的错误只留在控制台，便于本地排查。
    console.error('[ErrorBoundary] 页面渲染失败', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      <div className="container page">
        <section className="card error-state" role="alert">
          <p className="error-state__code mono" aria-hidden="true">
            ⚠
          </p>
          <h1 className="error-state__title">这个页面出问题了</h1>
          <p className="error-state__desc">
            页面在渲染时抛出了异常，其他功能不受影响。可以先刷新重试；
            如果刷新后仍然打不开，换一个页面继续使用即可。
          </p>

          {error.message ? (
            <p className="error-state__message mono">
              错误信息：{error.message}
            </p>
          ) : null}

          <div className="error-state__actions">
            <button type="button" className="btn btn--primary" onClick={this.handleReload}>
              刷新重试
            </button>
            {/*
              用普通 <a> 而不是 <Link>：错误边界是 class 组件，
              不应该依赖 Router 上下文，这样它也能用在 Router 之外。
              href 带上 BASE_URL，子路径部署时也能正确回到首页。
            */}
            <a className="btn btn--ghost" href={import.meta.env.BASE_URL}>
              回到首页
            </a>
          </div>
        </section>
      </div>
    );
  }
}
