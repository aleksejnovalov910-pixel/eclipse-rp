import { createApp } from 'vue';
import App from './App.vue';
import './styles/base.css';

/**
 * Точка входа интерфейса.
 *
 * Глобальный перехват ошибок стоит здесь не для красоты: CEF не показывает
 * консоль игроку, и упавший компонент выглядит как чёрный экран без причины.
 * Ошибка обязана попасть хотя бы в консоль клиента с указанием места.
 */
const app = createApp(App);

app.config.errorHandler = (error, _instance, info) => {
  console.error(`[eclipse:cef] ошибка интерфейса (${info})`, error);
};

app.mount('#app');
