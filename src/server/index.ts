import express, { Response, Request } from "express";
import cors from "cors";

const app = express();
app.use(express.json());

app.use(cors());

app.get("/ping", (req: Request, res: Response) => {
  res.json({ message: "BR4 BOT v2 is up and running!" });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.info(`listening on port, ${port}`);
});
