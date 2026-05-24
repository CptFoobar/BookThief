import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

const theme = createTheme({
  primaryColor: 'beige',
  colors: {
    beige: [
      "#f7f7d4","#f4f1c8","#f0ebbc","#ede5b0","#e9dfa3","#cabf8a","#aa9f70","#9b8f63","#8b7f56","#6b5f3c"
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
      <App />
    </MantineProvider>
  </React.StrictMode>,
)
