import Home from "./pages/Home";
import { ThemeProvider, createTheme } from "@mui/material";
import "./App.css";

function App() {
  const theme = createTheme({
    palette: {
      primary: {
        main: "#000000",
      },
    },
    typography: {
      fontFamily: ['"Anonymous Pro"', "monospace"].join(","),
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableRipple: true,
        },
        variants: [
          {
            props: { variant: "text" },
            style: { textTransform: "none" },
          },
        ],
      },
    },
  });

  return (
    <div>
      <ThemeProvider theme={theme}>
        <Home />
      </ThemeProvider>
    </div>
  );
}

export default App;

/// TODO: Create a basic 0 styling app that connects to your wallet and mints an NFT
