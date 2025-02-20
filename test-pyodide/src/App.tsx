import { useEffect, use, Suspense, useState } from "react";
import "./App.css";
import { loadPyodide } from "pyodide";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";

const initPyodide = async () => {
  return loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/",
  });
};

const reactQueryConfig = {
  networkMode: "offlineFirst" as any,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};

const queryClient = new QueryClient();

type PyodideAPI = Awaited<ReturnType<typeof initPyodide>>;

const runPython = (pyodide: PyodideAPI) => {
  const start = performance.now();
  // const { ws, ta: Ta, tc0: Tc0, tcMax: Tc_max } = values;
  // const globals = pyodide.toPy({ values: { ws, Ta, Tc0, Tc_max } });

  const response1 = pyodide.runPython(
    `
    import numpy as np
    import pandas as pd
    import plotly.graph_objects as go

    from mechaphlowers import SectionDataFrame
    from mechaphlowers.entities.arrays import SectionArray

    data = {
      "name": ["1", "2", "three", "support 4"],
      "suspension": [False, True, True, False],
      "conductor_attachment_altitude": [50.0, 40.0, 20.0, 10.0],
      "crossarm_length": [5.0,]* 4,
      "line_angle": [0.]* 4,
      "insulator_length": [0, 4, 3.2, 0],
      "span_length": [100, 200, 300, np.nan],
    }

    section = SectionArray(data=pd.DataFrame(data))
    print(section)

    # set sagging parameter and temperature 
    section.sagging_parameter = 500
    section.sagging_temperature = 15

    # Provide section to SectionDataFrame
    frame = SectionDataFrame(section)
    print(frame)

    # Display figure
    fig = go.Figure()
    frame.plot.line3d(fig)
    fig.show()
    `,
    {},
  );

  // result = response1.map((v: number) => v);

  // console.info('PYTHON RESULT CALC', values, result, ', Time', performance.now() - start);

  // const response2 = py.runPython(`
  //   from petale_celeste.api.functions import calc_compile
  //   calc_compile(values)
  // `, { globals });

  // result = response2.map((v: number) => v);

  // console.info('PYTHON RESULT CALC_COMPILE', values, result, ', Time', performance.now() - start);

  // return { success: true, result };
};

const MechaphlowersInit = ({ micropip, pyodide }: any) => {
  const [now1] = useState(Date.now());

  const { data, status, dataUpdatedAt } = useQuery({
    queryKey: ["mechaphlowers"],
    queryFn: async () => {
      await micropip.install("mechaphlowers");
      return "done";
    },
    ...reactQueryConfig,
  });

  if (status === "pending") {
    return <div>Loading mechaphlowers...</div>;
  }
  if (status === "error") {
    return <div>Error</div>;
  }

  const now2 = Date.now();
  runPython(pyodide);

  return (
    <div>
      <div>mechaphlowers is loaded ! Time to load: {(now2 - now1) / 1000}s</div>
    </div>
  );
};

const MicropipInit = ({ pyodide }: { pyodide?: PyodideAPI }) => {
  const [now1] = useState(Date.now());

  const { data, status, dataUpdatedAt } = useQuery({
    queryKey: ["micropip"],
    queryFn: () => pyodide?.loadPackage("micropip"),
    ...reactQueryConfig,
  });

  if (status === "pending") {
    return <div>Loading Micropip...</div>;
  }
  if (status === "error") {
    return <div>Error</div>;
  }

  const now2 = Date.now();

  return (
    <div>
      <div>Micropip is loaded ! Time to load: {(now2 - now1) / 1000}s</div>
      <MechaphlowersInit
        pyodide={pyodide}
        micropip={pyodide?.pyimport("micropip")}
      />
    </div>
  );
};

const PyodideInit = ({}: {}) => {
  const { data, status } = useQuery({
    queryKey: ["pyodide"],
    queryFn: initPyodide,
    ...reactQueryConfig,
  });
  const [now1] = useState(Date.now());
  if (status === "pending") {
    return <div>Loading Pyodide...</div>;
  }
  if (status === "error") {
    return <div>Error</div>;
  }

  const pyodide = data;
  const now2 = Date.now();
  return (
    <div>
      <div>Pyodide is loaded ! Time to load {(now2 - now1) / 1000}s</div>
      <MicropipInit pyodide={pyodide} />
    </div>
  );
};

function App() {
  const pyodoide = initPyodide();
  console.log("pyodoide", pyodoide);

  // useEffect(async () => {
  //   loadPyodide({
  //     indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/",
  //   }).then(async (pyodide) => {
  //     await pyodide.loadPackage("micropip");
  //     const micropip = pyodide.pyimport("micropip");
  //     await micropip.install("mechaphlowers");
  //   });
  // }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <PyodideInit />
      </div>
    </QueryClientProvider>
  );
}

export default App;
