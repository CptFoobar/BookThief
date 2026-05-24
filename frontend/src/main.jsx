import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

const theme = createTheme({
  primaryColor: 'beige',
  colors: {
    beige: [
      "#fdfdf5", "#fef9e8", "#fef5da", "#fef1cd", "#feedbf", "#ffe9b2", "#ffe5a4", "#ffe197", "#ffdd89", "#ffd773"
    ],
  },
  components: {
    Button: {
      defaultProps: {
        color: 'black',
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <Notifications />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>,
)
