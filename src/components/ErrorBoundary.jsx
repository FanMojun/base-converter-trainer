import { Component } from 'react';

import './ErrorBoundary.css';

/**
 * 按需加载的分包取不到时，各浏览器/打包器抛出的信息都不一样，这里统一识别。
 * 「Unable to preload CSS」是 Vite 为懒加载分包预取样式失败时报的错，
 * 真实断网测试里最先撞上的就是它。
 */
const CHUNK_ERROR_PATTERN =
  /dynamically imported module|Importing a module script failed|Unable to preload|ChunkLoadError|Loading chunk/i;

/**
 * 把异常翻译成用户能看懂的说法。
 *
 * 实践中最常见的「整页打不开」其实不是代码 bug：按需加载的分包下不来。
 * 原因有两种 —— 离线时该页面还没被缓存，或者应用发了新版本、
 * 旧页面还在引用已经被删掉的 hash 文件。这两种都不该只丢一句「出问题了」。
 *
 * 注意 navigator.onLine 并不可靠：服务器连不上时它照样可能返回 true，
 * 所以它只能用来「确认离线」，不能用来「确认在线」。
 */
function describeFailure(error, isOffline) {
  const message = error?.message ?? '';

  if (!CHUNK_ERROR_PATTERN.test(message)) {
    return {
      title: '这个页面出问题了',
      description:
        '页面在渲染时抛出了异常，其他功能不受影响。可以先刷新重试；如果刷新后仍然打不开，换一个页面继续使用即可。',
    };
  }

  if (isOffline) {
    return {
      title: '这个页面还没有离线缓存',
      description:
        '应用外壳可以离线打开，但部分页面是按需加载的，需要先联网访问过一次。联网后打开一次这个页面，之后离线也能用了。',
    };
  }

  return {
    title: '页面资源没能加载',
    description:
      '可能是网络断了，也可能是应用刚发布了新版本。先刷新重试；如果当前没有网络，联网打开一次这个页面，之后就能离线使用了。',
  };
}

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

    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const { title, description } = describeFailure(error, isOffline);

    return (
      <div className="container page">
        <section className="card error-state" role="alert">
          <p className="error-state__code mono" aria-hidden="true">
            ⚠
          </p>
          <h1 className="error-state__title">{title}</h1>
          <p className="error-state__desc">{description}</p>

          {error.message ? (
            <p className="error-state__message mono">错误信息：{error.message}</p>
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
