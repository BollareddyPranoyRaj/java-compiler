import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());


app.post("/api/run", (req, res) => {
  const { code, stdin, language } = req.body;
  console.log("Received code:", code);
  console.log("Language:", language);
  console.log("Input:", stdin);


  res.json({
    stdout: "Hello from mock backend!",
    stderr: "",
    exitCode: 0,
    error: null
  });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Mock backend running on http://localhost:${PORT}`));
