"""Smoke-check a locally served production bundle.

Run after `npm run build` and a Vite preview server. The target defaults to the
loopback-only preview address and can be overridden with APP_PREVIEW_URL.
"""

import os

from playwright.sync_api import sync_playwright


base_url = os.environ.get("APP_PREVIEW_URL", "http://127.0.0.1:4173")
console_errors: list[str] = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.on(
        "console",
        lambda message: console_errors.append(message.text)
        if message.type == "error"
        else None,
    )

    response = page.goto(base_url, wait_until="networkidle")
    assert response is not None and response.ok, f"预览首页无法访问：{base_url}"
    assert page.title() == "AI Agent 学习地图", "页面标题不符合发布基线"
    assert page.get_by_role("heading", name="你的学习地图").is_visible(), "学习地图未渲染"

    lesson_url = f"{base_url.rstrip('/')}/lesson/0-1"
    response = page.goto(lesson_url, wait_until="networkidle")
    assert response is not None and response.ok, f"课程直达地址无法访问：{lesson_url}"
    assert page.url.endswith("/lesson/0-1"), "课程路由不可达"
    assert page.get_by_role("heading", name="你已经在用 Agent 了").is_visible(), "课程页未渲染"
    assert not console_errors, f"预览页产生控制台错误：{console_errors}"
    browser.close()

print(f"生产预览冒烟检查通过：{base_url}")
