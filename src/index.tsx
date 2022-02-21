import { render } from "preact";

import "./index.css";

const Main = () => {
  return <h1>Hello world!</h1>;
};

render(<Main />, document.getElementById("app")!);
