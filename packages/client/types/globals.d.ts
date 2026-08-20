/**
 * Глобальные функции клиентского рантайма RAGE MP, которых нет в стандартных
 * lib-файлах TypeScript.
 *
 * Клиент RAGE MP — не браузер и не Node: DOM-библиотеку подключать нельзя
 * (иначе станут «доступны» document и window, которых там нет), а таймеры
 * при этом реализованы. Объявляем ровно то, что действительно существует.
 *
 * Возвращаемый тип — number, а не NodeJS.Timeout: это важно, потому что код
 * хранит идентификаторы таймеров в структурах данных.
 */
declare function setTimeout(handler: () => void, timeout?: number): number;
declare function clearTimeout(handle: number): void;
declare function setInterval(handler: () => void, timeout?: number): number;
declare function clearInterval(handle: number): void;
