/**
 * 应用根组件。
 * 项目初始化阶段只挂载一个占位视图，后续按模块逐步接入路由与页面。
 */
export default function App() {
  return (
    <main className="container page">
      <h1 className="page__title">Base Converter Trainer</h1>
      <p className="page__subtitle">
        项目脚手架已就绪：Vite + React + ESLint + Vitest。转换引擎与各功能页面正在开发中。
      </p>
    </main>
  );
}
