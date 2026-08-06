import csv
import json
from io import BytesIO, StringIO
import networkx as nx
from pypdf import PdfReader
from logger_config import (
    get_logger,
)

from core.exceptions import (
    DatasetReaderError,
    UnsupportedDatasetFormatError,
)

logger = get_logger(__name__)


class DatasetReader:

    @staticmethod
    def read_txt(file_bytes: bytes) -> str:

        try:
            return file_bytes.decode("utf-8")

        except Exception as e:
            logger.exception(
                "Failed to read txt dataset"
            )

            raise DatasetReaderError(
                "Invalid txt file.",
                details={
                    "reason": str(e),
                },
            ) from e

    @staticmethod
    def read_csv(file_bytes: bytes) -> str:
        logger.info(
            "Reading CSV dataset"
        )
        try:
            content = file_bytes.decode(
                "utf-8"
            )

            # Interpret the CSV as an edge list using common column names.

            reader = csv.DictReader(
                StringIO(content)
            )

            lines = []

            for row in reader:

                source = (
                        row.get("source")
                        or row.get("Source")
                )

                target = (
                        row.get("target")
                        or row.get("Target")
                )

                weight = (
                        row.get("weight")
                        or row.get("Weight")
                        or "1"
                )

                if not source or not target:
                    continue

                lines.append(
                    f"{source} {target} {weight}"
                )
            logger.info(
                "CSV dataset loaded "
                "(%d relations)",
                len(lines),
            )
            return "\n".join(lines)

        except Exception as e:
            logger.exception(
                "Failed to read csv dataset"
            )

            raise DatasetReaderError(
                "Failed to read csv dataset.",
                details={
                    "reason": str(e),
                },
            ) from e

    @staticmethod
    def read_json(file_bytes: bytes) -> dict:
        try:
            content = file_bytes.decode("utf-8")
            data = json.loads(content)

            if (
                    not isinstance(data, dict)
                    or "nodes" not in data
                    or "edges" not in data
            ):
                raise DatasetReaderError(
                    "Invalid network.json format."
                )

            return data

        except Exception as e:
            logger.exception(
                "Failed to read json dataset"
            )

            raise DatasetReaderError(
                "Failed to read json dataset.",
                details={
                    "reason": str(e),
                },
            ) from e

    @staticmethod
    def read_pdf(file_bytes: bytes) -> str:
        logger.info(
            "Reading PDF dataset"
        )
        try:

            # Extract plain text before parsing relationships.

            reader = PdfReader(
                BytesIO(file_bytes)
            )

            lines = []

            for page in reader.pages:

                text = page.extract_text()

                if not text:
                    continue

                lines.extend(
                    text.splitlines()
                )

            logger.info(
                "PDF dataset loaded "
                "(%d relations)",
                len(lines),
            )

            return "\n".join(lines)
        except Exception as e:
            logger.exception(
                "Failed to read pdf dataset"
            )

            raise DatasetReaderError(
                "Failed to read pdf dataset.",
                details={
                    "reason": str(e),
                },
            ) from e

    @staticmethod
    def read_graphml(file_bytes: bytes) -> str | dict:
        logger.info(
            "Reading GRAPHML dataset"
        )
        try:

            # Load the GraphML structure through NetworkX.

            graph = nx.read_graphml(
                BytesIO(file_bytes)
            )

            lines = []

            for source, target, attrs in graph.edges(data=True):
                weight = attrs.get(
                    "weight",
                    1
                )

                lines.append(
                    f"{source} {target} {weight}"
                )

            return "\n".join(lines)

        except Exception as e:
            logger.exception(
                "Failed to read graphml dataset"
            )

            raise DatasetReaderError(
                "Failed to read graphml dataset.",
                details={
                    "reason": str(e),
                },
            ) from e

    @classmethod
    def read(
            cls,
            filename: str,
            file_bytes: bytes
    ) -> str:

        # Dispatch the dataset to the appropriate reader based on its extension.

        extension = (
            filename
            .split(".")[-1]
            .lower()
        )

        logger.info(
            "Reading dataset type=%s",
            extension,
        )

        if extension == "txt":
            return cls.read_txt(
                file_bytes
            )

        if extension == "csv":
            return cls.read_csv(
                file_bytes
            )

        if extension == "json":
            return cls.read_json(
                file_bytes
            )

        if extension == "pdf":
            return cls.read_pdf(
                file_bytes
            )

        if extension == "graphml":
            return cls.read_graphml(
                file_bytes
            )

        raise UnsupportedDatasetFormatError(
            f"Unsupported file type: {extension}",
            details={
                "extension": extension,
            },
        )
