# HOST TEST READY — FULL GATE

`HOST TEST READY` выставляется только после прохождения всего этого списка, а не после одной лишь готовности deployment-пакета.

## Игровые системы
- [ ] 1. World interaction: дома, бизнесы, автосалоны, магазины, организации, работы и другие точки через игровой мир.
- [ ] 2. Полный HUD: район/улица, server/static ID, voice status, vehicle HUD, notifications.
- [ ] 3. Radial/context menu для игрока и транспорта.
- [ ] 4. Документы игрока/авто и показ другому игроку.
- [ ] 5. LSPD: задержание, наручники, обыск, изъятие, тюрьма.
- [ ] 6. EMS: downed/death, revive, hospital loop.
- [ ] 7. Организационный транспорт, склад, форма.
- [ ] 8. Семейный транспорт, склад, контракты, upgrades.
- [ ] 9. Недвижимость: аренда, налоги, storage, garage, furniture.
- [ ] 10. Бизнесы: сотрудники, зарплаты, расширенные логи, upgrades.
- [ ] 11. Тюнинг: визуальные моды, колёса, цвета, preview.
- [ ] 12. Marketplace: предметы, search/filter/sort/history, auctions.
- [ ] 13. Телефон: calls, GPS, bank, marketplace, ads.
- [ ] 14. Полный набор профессий и глубокие job loops.
- [ ] 15. Crafting/recipes/production.
- [ ] 16. Weapons/armour/gun stores.
- [ ] 17. Casino, activities, events, mini-games.
- [ ] 18. Achievements, daily/weekly, battle pass.
- [ ] 19. Admin + RBAC.

## Надёжность и безопасность
- [ ] 20. Полный anti-abuse / anti-dupe / idempotency audit денежных и предметных операций.
- [ ] 21. Restart/reconnect tests: vehicle, job, property, family, organization, purchase.
- [ ] 22. Multi-player race tests для purchase/market/storage.

## Deployment
- [x] 23. Fresh-install контур для чистого Linux RAGE MP host.
- [x] 24. `.env.production.example` + production config.
- [ ] 25. Проверка запуска на настоящем RAGE MP Linux server runtime.
- [x] 26. Production DB migration/seed procedure.
- [x] 27. Финальный layout `packages/`, `client_packages/`, CEF и configs.
- [ ] 28. Live host smoke: register → character → world → vehicle → shop → bank → reconnect.
- [ ] 29. Финальный архив/Release после live smoke.

## Статусы
- `IN DEVELOPMENT` — есть незакрытые пункты 1–22.
- `HOST PACKAGE READY` — deployment 23/24/26/27 готов, но игровой gate ещё не закрыт.
- `HOST TEST READY` — пункты 1–24, 26–27 закрыты; остаётся только реальный host verification 25/28 и финальный release 29, если доступ к runtime физически отсутствует.
- `HOST VERIFIED` — закрыты 25 и 28.
- `RELEASE READY` — закрыт 29.
