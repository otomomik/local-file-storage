import lancedb

# Initialize the LanceDB Viewer
db = lancedb.connect("../mlx-whisper-example/.local/file-system/lancedb")


table = db.open_table("file_references")

print(table.to_arrow())
