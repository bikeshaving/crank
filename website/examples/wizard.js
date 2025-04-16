import {renderer} from "@b9g/crank/dom";

function* Wizard() {
  let step = 0;
  const formData = new FormData();
  this.addEventListener("submit", (ev) => {
    const isValid = ev.target.reportValidity();
    if (isValid) {
      ev.preventDefault();
      const data = new FormData(ev.target);
      for (const [key, value] of data) {
        formData.append(key, value);
      }

      // Code to handle form submission
      step++;
      this.refresh();
    }
  });

  for ({} of this) {
    yield (
      <form $key={step}>
        {step === 0 ? (
          <>
            <label for="name">Name:</label>
            <br />
            <input name="name" type="text" required />
            <br />
            <label for="email">Email:</label>
            <br />
            <input name="email" type="email" required />
            <br />
            <br />
            <button type="submit">Next</button>
          </>
        ) : step === 1 ? (
          <>
            <label for="profile">Profile:</label>
            <br />
            <textarea name="profile" required />
            <br />
            <label for="avatar">Avatar:</label>
            <br />
            <input name="avatar" type="file" />
            <br />
            <br />
            <button type="submit">Submit</button>
          </>
        ) : (
          <pre>{JSON.stringify(Object.fromEntries(formData), null, 2)}</pre>
        )}
      </form>
    );
  }
}

renderer.render(<Wizard />, document.body);
