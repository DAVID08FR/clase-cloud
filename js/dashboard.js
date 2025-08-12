/**********************
 * Supabase
 **********************/
const SUPABASE_URL = "https://fzbheuoaxnenhrwadrvn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6YmhldW9heG5lbmhyd2FkcnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDUwOTMsImV4cCI6MjA3MDA4MTA5M30.49jF_IMBuvKt-HWpmN-9USgw6tDqUKzrW1uaOqNFi40"; // reemplaza por tu clave real
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let estudianteEditandoId = null;

/**********************
 * Helpers UI
 **********************/
function setGuardarEnActualizar(estaEditando) {
  const btn = document.getElementById("btn-guardar");
  if (!btn) return;
  btn.innerHTML = estaEditando
    ? '<i class="fas fa-check-circle me-2"></i>Actualizar'
    : '<i class="fas fa-plus-circle me-2"></i>Agregar';
  btn.onclick = estaEditando ? actualizarEstudiante : agregarEstudiante;
}

/**********************
 * Estudiantes: CRUD
 **********************/
async function agregarEstudiante() {
  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const clase  = document.getElementById("clase").value.trim();

  if (!nombre || !correo || !clase) return alert("Completa todos los campos.");

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return alert("No estás autenticado.");

  const { error } = await client.from("estudiantes").insert({ nombre, correo, clase, user_id: user.id });
  if (error) return alert("Error al agregar: " + error.message);

  limpiarFormulario();
  await cargarEstudiantes();
  alert("Estudiante agregado");
}

async function cargarEstudiantes() {
  const { data, error } = await client
    .from("estudiantes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { alert("Error al cargar estudiantes: " + error.message); return; }

  const lista = document.getElementById("lista-estudiantes");
  const empty = document.getElementById("empty-estudiantes");
  lista.innerHTML = "";

  if (!data || data.length === 0) {
    empty.classList.remove("d-none");
    return;
  }
  empty.classList.add("d-none");

  data.forEach((est) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";

    // Info con correo visible
    const info = document.createElement("span");
    info.innerHTML = `<strong>${est.nombre}</strong> (${est.clase}) — ${est.correo || ""}`;

    // Botones
    const acciones = document.createElement("div");

    const btnEditar = document.createElement("button");
    btnEditar.type = "button";
    btnEditar.className = "btn btn-sm btn-outline-primary me-2";
    btnEditar.innerHTML = `<i class="fas fa-edit me-1"></i>Editar`;
    btnEditar.addEventListener("click", () => editarEstudiante(est));

    const btnEliminar = document.createElement("button");
    btnEliminar.type = "button";
    btnEliminar.className = "btn btn-sm btn-outline-danger";
    btnEliminar.innerHTML = `<i class="fas fa-trash-alt me-1"></i>Eliminar`;
    btnEliminar.addEventListener("click", () => eliminarEstudiante(est.id));

    acciones.appendChild(btnEditar);
    acciones.appendChild(btnEliminar);

    li.appendChild(info);
    li.appendChild(acciones);
    lista.appendChild(li);
  });
}

function editarEstudiante(est) {
  document.getElementById("nombre").value = est.nombre || "";
  document.getElementById("correo").value = est.correo || "";
  document.getElementById("clase").value  = est.clase  || "";
  estudianteEditandoId = est.id;
  setGuardarEnActualizar(true);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function actualizarEstudiante() {
  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const clase  = document.getElementById("clase").value.trim();
  if (!estudianteEditandoId) return;

  const { error } = await client
    .from("estudiantes")
    .update({ nombre, correo, clase })
    .eq("id", estudianteEditandoId);

  if (error) return alert("Error al actualizar: " + error.message);

  estudianteEditandoId = null;
  limpiarFormulario();
  await cargarEstudiantes();
  alert("Estudiante actualizado");
}

async function eliminarEstudiante(id) {
  if (!confirm("¿Eliminar este estudiante?")) return;
  const { error } = await client.from("estudiantes").delete().eq("id", id);
  if (error) return alert("Error al eliminar: " + error.message);
  await cargarEstudiantes();
  alert("Estudiante eliminado");
}

function limpiarFormulario() {
  document.getElementById("nombre").value = "";
  document.getElementById("correo").value = "";
  document.getElementById("clase").value  = "";
  setGuardarEnActualizar(false);
}

/**********************
 * Storage: subir / listar / borrar
 **********************/
async function subirArchivo() {
  const archivoInput = document.getElementById("archivo");
  const archivo = archivoInput.files[0];
  if (!archivo) return alert("Selecciona un archivo primero.");

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return alert("Sesión no válida.");

  const path = `${user.id}/${archivo.name}`; // ruta dentro del bucket
  const { error } = await client.storage.from("tareas").upload(path, archivo, {
    cacheControl: "3600",
    upsert: true, // permitir reemplazo
  });

  if (error) return alert("Error al subir: " + error.message);
  archivoInput.value = "";
  await listarArchivos();
  alert("Archivo subido correctamente.");
}

async function listarArchivos() {
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return alert("Sesión no válida.");

  const lista = document.getElementById("lista-archivos");
  lista.innerHTML = "";

  const dir = `${user.id}/`; // carpeta del usuario
  const { data: files, error } = await client.storage
    .from("tareas")
    .list(dir, { limit: 50, sortBy: { column: "updated_at", order: "desc" } });

  if (error) {
    console.error(error);
    lista.innerHTML = `<li class="list-group-item text-danger">Error al listar archivos</li>`;
    return;
  }

  if (!files || files.length === 0) {
    lista.innerHTML = `<li class="list-group-item text-muted">Sin archivos</li>`;
    return;
  }

  for (const f of files) {
    const { data: signed, error: urlErr } = await client.storage
      .from("tareas")
      .createSignedUrl(`${dir}${f.name}`, 60 * 60); // 1 hora

    if (urlErr) { console.error(urlErr); continue; }
    const url = signed.signedUrl;

    const esImagen = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
    const esPDF    = /\.pdf$/i.test(f.name);

    const li = document.createElement("li");
    li.className = "list-group-item d-flex align-items-center justify-content-between";

    const left = document.createElement("div");
    left.className = "d-flex align-items-center gap-3";

    if (esImagen) {
      const img = document.createElement("img");
      img.src = url; img.alt = f.name; img.style.maxHeight = "48px"; img.className = "rounded border";
      left.appendChild(img);
    }

    const info = document.createElement("div");
    info.innerHTML = `
      <div class="fw-semibold">${f.name}</div>
      ${esImagen ? `<a href="${url}" target="_blank">Ver imagen</a>` :
       esPDF    ? `<a href="${url}" target="_blank">Ver PDF</a>` :
                  `<a href="${url}" target="_blank">Descargar</a>`}
    `;
    left.appendChild(info);

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-sm btn-outline-danger";
    btnDel.innerHTML = `<i class="fas fa-trash-alt me-1"></i>Borrar`;
    btnDel.addEventListener("click", async () => {
      if (!confirm("¿Eliminar este archivo?")) return;
      const { error: delErr } = await client.storage.from("tareas").remove([`${dir}${f.name}`]);
      if (delErr) return alert("No se pudo eliminar: " + delErr.message);
      listarArchivos();
    });

    li.appendChild(left);
    li.appendChild(btnDel);
    lista.appendChild(li);
  }
}

/**********************
 * Sesión
 **********************/
async function cerrarSesion() {
  const { error } = await client.auth.signOut();
  if (error) return alert("Error al cerrar sesión: " + error.message);
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

/**********************
 * Init
 **********************/
document.addEventListener("DOMContentLoaded", async () => {
  await cargarEstudiantes();
  await listarArchivos();
});

// Exponer funciones (por si tu HTML las llama)
window.agregarEstudiante = agregarEstudiante;
window.actualizarEstudiante = actualizarEstudiante;
window.subirArchivo = subirArchivo;
window.cerrarSesion = cerrarSesion;
