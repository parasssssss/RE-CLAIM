const params = new URLSearchParams(window.location.search);
const itemId = params.get("item_id");

if (!itemId) {
  alert("Invalid item");
} else {
  async function loadItem() {
    const token = localStorage.getItem("token");

    const res = await fetch(`http://127.0.0.1:8000/item/${itemId}`, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) {
      alert("Item not found or access denied");
      return;
    }

    const item = await res.json();

    document.getElementById("itemName").innerText = item.item_type;
    document.getElementById("itemColor").innerText = item.color;
    document.getElementById("itemStatus").innerText = item.status;
    document.getElementById("itemImage").src = `http://127.0.0.1:8000/${item.image_path}`;
  }

  loadItem();
}
