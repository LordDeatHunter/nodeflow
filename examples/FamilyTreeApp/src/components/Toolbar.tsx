import { Component } from "solid-js";
import toolbarCss from "../styles/toolbar.module.scss";
import { sortTree } from "../utils";

const SortIcon: Component = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="8.5" y="2.5" width="7" height="5" rx="1.25" />
    <rect x="2.5" y="16.5" width="7" height="5" rx="1.25" />
    <rect x="14.5" y="16.5" width="7" height="5" rx="1.25" />
    <path d="M12 7.5V12M6 16.5V14a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2.5" />
  </svg>
);

const Toolbar: Component = () => (
  <div class={toolbarCss.toolbar}>
    <button
      class={toolbarCss.toolbarButton}
      onClick={sortTree}
      title="Sort tree"
      aria-label="Sort tree"
    >
      <SortIcon />
    </button>
  </div>
);

export default Toolbar;
